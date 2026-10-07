import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { decodeQr } from '../modules/qr-decoder/index.js';
import {
  InvalidImageError,
  NoQrDetectedError,
  DecodeFailedError,
} from '../modules/qr-decoder/errors.js';
import { parsePaymentPayload } from '../modules/payment-parser/index.js';
import { PaymentParserError } from '../modules/payment-parser/errors.js';
import { verifyDestination } from '../modules/verification-engine/index.js';
import type { TrustedDestination } from '../modules/verification-engine/types.js';
import { analyzeImageQuality } from '../modules/image-quality/index.js';
import { ImageQualityError } from '../modules/image-quality/errors.js';
import type {
  BrightnessClassification,
  ContrastClassification,
  OverallQualityClassification,
  QualityFlag,
  SharpnessClassification,
} from '../modules/image-quality/types.js';
import { composeVerificationResult } from '../modules/composite-verification/index.js';
import type {
  CanonicalCompositeStatus,
  CompositeRecommendation,
  CompositeRiskFactor,
} from '../modules/composite-verification/types.js';
import {
  findActiveTrustedDestinations,
  findActiveTrustedDestinationsForMerchant,
  findActiveReferenceQrForMerchant,
  downloadReferenceQrImage,
  type TrustedRegistryDestination,
  type ReferenceQrRecord,
} from '../integrations/trusted-registry/index.js';
import { RegistryError } from '../integrations/trusted-registry/errors.js';
import { analyzeQrVisualDifference } from '../modules/tamper-analysis/index.js';
import type {
  TamperAnalysisResult,
  AlignmentClassification,
  AnalysisQuality,
  AnomalyIndicator,
  TamperRecommendation,
} from '../modules/tamper-analysis/types.js';
import {
  generateExplanation,
  type ExplanationInput,
} from '../integrations/gemini/index.js';

/**
 * Permitted image MIME types per system specification.
 */
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Maximum permitted image size: 10 MB.
 */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Strict UUID v4 regex for merchant parameter validation.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates merchant identifier: strictly enforces UUID v4 in production,
 * allowing established mock identifiers under test execution.
 */
function isSafeMerchantId(id: string): boolean {
  if (UUID_REGEX.test(id)) return true;
  if (process.env.NODE_ENV === 'test' && /^merchant-[a-z0-9_-]+$/i.test(id)) {
    return true;
  }
  return false;
}

/**
 * Response structure for successful QR destination verification.
 */
export interface VerifySuccessResponse {
  verification_status: CanonicalCompositeStatus;
  decoded_payload: string;
  normalized_destination: string | null;
  registered_destination: string | null;
  destination_match: boolean;
  evidence: {
    normalized_scanned_destination: string | null;
    active_trusted_destinations_checked: number;
    exact_match: boolean;
  };
  image_quality: {
    overall_quality: OverallQualityClassification;
    mean_brightness: number;
    contrast_score: number;
    sharpness_score: number;
    dynamic_range: number;
    brightness_classification: BrightnessClassification;
    contrast_classification: ContrastClassification;
    sharpness_classification: SharpnessClassification;
    quality_flags: QualityFlag[];
  };
  composite_evidence: {
    destination: {
      scanned_destination: string | null;
      destination_match: boolean;
      active_trusted_destinations_checked: number;
      exact_match: boolean;
    };
    image_quality: {
      overall_quality: OverallQualityClassification;
      brightness_classification: BrightnessClassification;
      contrast_classification: ContrastClassification;
      sharpness_classification: SharpnessClassification;
    };
    tamper: {
      available: boolean;
      reference_available: boolean;
      analysis_quality?: AnalysisQuality | null;
      visual_deviation_index?: number | null;
      alignment_quality?: number | null;
      alignment_classification?: AlignmentClassification | null;
      matrix_mismatch_ratio?: number | null;
      boundary_anomaly_detected?: boolean | null;
      boundary_anomaly_score?: number | null;
      anomaly_indicators?: AnomalyIndicator[] | null;
      recommendation?: TamperRecommendation | null;
    };
  };
  risk_factors: CompositeRiskFactor[];
  recommendation: CompositeRecommendation;
  explanation: string;
  explanation_metadata: {
    provider: 'gemini' | 'deterministic_fallback';
    model: 'gemini-3.8-flash' | null;
  };
  processing_metadata: {
    verification_id: string;
    timestamp: string;
    duration_ms: number;
  };
}

/**
 * Registers the end-to-end QR destination verification route: POST /api/v1/verify
 */
export async function verifyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = performance.now();

    // 1. Guard against non-multipart requests
    if (!request.isMultipart()) {
      return reply.status(400).send({
        error: {
          code: 'E_INVALID_REQUEST',
          message: 'Invalid request content-type. Expected multipart/form-data.',
          details:
            'The request must be submitted as multipart/form-data with an "image" file.',
        },
      });
    }

    let imageBuffer: Buffer | null = null;
    let imageMimeType: string | null = null;
    let isTruncated = false;
    let merchantId: string | undefined = undefined;
    let optInAudit: boolean | undefined = undefined;
    let fileCount = 0;

    // 2. Safely parse multipart parts in-memory
    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          fileCount++;
          if (fileCount > 1) {
            // Drain the extra file stream to prevent connection leaks
            await part.toBuffer();
            return reply.status(400).send({
              error: {
                code: 'E_TOO_MANY_FILES',
                message: 'Only a single image file may be uploaded per request.',
                details: 'Maximum number of uploaded files is 1.',
              },
            });
          }

          if (part.fieldname !== 'image') {
            await part.toBuffer();
            continue;
          }

          imageMimeType = part.mimetype?.toLowerCase() ?? null;
          const buf = await part.toBuffer();
          if (part.file.truncated || buf.length > MAX_FILE_SIZE_BYTES) {
            isTruncated = true;
          }
          imageBuffer = buf;
        } else {
          // Form field handling
          if (part.fieldname === 'merchant_id') {
            const val = typeof part.value === 'string' ? part.value.trim() : '';
            if (val.length > 0) {
              if (merchantId !== undefined && merchantId !== val) {
                return reply.status(400).send({
                  error: {
                    code: 'E_AMBIGUOUS_MERCHANT_ID',
                    message: 'Conflicting duplicate merchant_id fields supplied.',
                    details: 'Multiple conflicting merchant_id values are not permitted.',
                  },
                });
              }
              merchantId = val;
            }
          } else if (part.fieldname === 'opt_in_audit') {
            if (typeof part.value === 'boolean') {
              optInAudit = part.value;
            } else if (typeof part.value === 'string') {
              optInAudit = part.value.toLowerCase() === 'true' || part.value === '1';
            }
          }
        }
      }
    } catch (err: unknown) {
      const fastifyErr = err as { code?: string; statusCode?: number };
      if (
        fastifyErr?.code === 'FST_REQ_FILE_TOO_LARGE' ||
        fastifyErr?.statusCode === 413
      ) {
        return reply.status(413).send({
          error: {
            code: 'E_PAYLOAD_TOO_LARGE',
            message: 'Uploaded file exceeds maximum permitted limit of 10 MB.',
            details: 'The maximum allowed file size is 10 MB.',
          },
        });
      }
      return reply.status(400).send({
        error: {
          code: 'E_MALFORMED_MULTIPART',
          message: 'Malformed multipart/form-data request.',
          details: 'Could not parse multipart request payload.',
        },
      });
    }

    // 3. Validation checks
    if (isTruncated || (imageBuffer && imageBuffer.length > MAX_FILE_SIZE_BYTES)) {
      return reply.status(413).send({
        error: {
          code: 'E_PAYLOAD_TOO_LARGE',
          message: 'Uploaded file exceeds maximum permitted limit of 10 MB.',
          details: 'The maximum allowed file size is 10 MB.',
        },
      });
    }

    if (!imageBuffer) {
      return reply.status(400).send({
        error: {
          code: 'E_MISSING_IMAGE',
          message: 'Missing required "image" file in multipart request.',
          details: 'A valid image file under the form field "image" must be provided.',
        },
      });
    }

    if (imageBuffer.length === 0) {
      return reply.status(400).send({
        error: {
          code: 'E_EMPTY_IMAGE',
          message: 'Uploaded image file is empty.',
          details: 'The uploaded image file must not be 0 bytes.',
        },
      });
    }

    if (!imageMimeType || !ALLOWED_MIME_TYPES.has(imageMimeType)) {
      return reply.status(400).send({
        error: {
          code: 'E_UNSUPPORTED_MIME_TYPE',
          message: `Unsupported image MIME type '${imageMimeType ?? 'unknown'}'. Allowed formats: image/jpeg, image/png, image/webp.`,
          details: 'Only JPEG, PNG, and WebP image formats are accepted.',
        },
      });
    }

    if (merchantId !== undefined && !isSafeMerchantId(merchantId)) {
      return reply.status(400).send({
        error: {
          code: 'E_INVALID_MERCHANT_ID',
          message: 'The provided merchant_id must be a valid UUID.',
          details: 'Invalid UUID format for merchant_id.',
        },
      });
    }

    // 4. Verification pipeline orchestration
    try {
      // Step 1: Decode QR code from in-memory image buffer
      const decoded = await decodeQr(imageBuffer);

      // Step 2: Parse payment payload
      const parsedPayload = parsePaymentPayload(decoded.rawPayload);

      // Step 3: Concurrently fetch trusted destinations, reference record, and image quality
      const registryPromise = (async (): Promise<TrustedRegistryDestination[]> => {
        if (parsedPayload.format === 'UPI_URI') {
          const destinationType = 'VPA';
          if (merchantId) {
            return findActiveTrustedDestinationsForMerchant(merchantId, destinationType);
          }
          return findActiveTrustedDestinations(
            parsedPayload.paymentAddress,
            destinationType,
          );
        }
        if (parsedPayload.format === 'GENERIC_URL') {
          const destinationType = 'URL';
          if (merchantId) {
            return findActiveTrustedDestinationsForMerchant(merchantId, destinationType);
          }
          return findActiveTrustedDestinations(parsedPayload.url, destinationType);
        }
        return [];
      })();

      const referencePromise: Promise<ReferenceQrRecord | null> = merchantId
        ? findActiveReferenceQrForMerchant(merchantId).catch((refErr: unknown) => {
            request.log.warn(
              { err: refErr, merchant_id: merchantId },
              'Failed to retrieve merchant reference QR; proceeding with destination verification',
            );
            return null;
          })
        : Promise.resolve(null);

      const imageQualityPromise = analyzeImageQuality(imageBuffer);

      const [registryRecords, referenceRecord, imageQualityResult] = await Promise.all([
        registryPromise,
        referencePromise,
        imageQualityPromise,
      ]);

      const trustedDestinations: TrustedDestination[] = registryRecords
        .filter(
          (d): d is typeof d & { destinationType: 'VPA' | 'URL' } =>
            d.destinationType === 'VPA' || d.destinationType === 'URL',
        )
        .map((d) => ({
          merchantId: d.merchantId,
          destinationType: d.destinationType,
          destinationValue: d.destinationValue,
          isActive: d.isActive,
        }));

      // Step 4: Run pure verification engine (destination matching)
      const destinationResult = verifyDestination(parsedPayload, trustedDestinations);

      // Step 5: Physical QR Tamper Analysis (when merchant context is supplied and has an active reference QR)
      let referenceBuffer: Buffer | null = null;
      let tamperResult: TamperAnalysisResult | null = null;

      if (referenceRecord) {
        try {
          referenceBuffer = await downloadReferenceQrImage(referenceRecord.storagePath);
          if (referenceBuffer) {
            try {
              tamperResult = await analyzeQrVisualDifference(
                referenceBuffer,
                imageBuffer,
                { candidateDecoded: decoded },
              );
            } catch (tamperErr: unknown) {
              request.log.warn(
                { err: tamperErr, merchant_id: merchantId },
                'Physical tamper analysis could not be completed; visual comparison inconclusive',
              );
            }
          }
        } catch (refErr: unknown) {
          request.log.warn(
            { err: refErr, merchant_id: merchantId },
            'Failed to download reference QR image; visual comparison inconclusive',
          );
        }
      }

      // Step 6: Composite verification
      const compositeResult = composeVerificationResult(
        destinationResult,
        imageQualityResult,
        tamperResult,
      );

      // Step 8: Authoritative canonical status anchor
      // Architectural rule: Gemini has ZERO authority over verification_status
      const authoritativeStatus = compositeResult.status;

      // Step 9: Gemini explanation layer (explanation-only, zero decision authority)
      const explanationInput: ExplanationInput = {
        canonicalStatus: authoritativeStatus,
        scannedDestination: compositeResult.evidence.destination.scannedDestination,
        matchedDestination: compositeResult.matchedDestination,
        destinationMatch: compositeResult.destinationMatch,
        riskFactors: compositeResult.riskFactors,
        recommendation: compositeResult.recommendation,
        imageQualitySummary: {
          overallQuality: compositeResult.evidence.imageQuality.overallQuality,
          brightnessClassification:
            compositeResult.evidence.imageQuality.brightnessClassification,
          contrastClassification:
            compositeResult.evidence.imageQuality.contrastClassification,
          sharpnessClassification:
            compositeResult.evidence.imageQuality.sharpnessClassification,
        },
        tamperSummary: tamperResult
          ? {
              evaluated: true,
              tamperDetected:
                authoritativeStatus === 'SUSPICIOUS' ||
                tamperResult.boundaryAnomalyDetected,
              confidenceScore: tamperResult.alignmentQuality,
              riskScore: tamperResult.visualDeviationIndex,
              anomalyFlags: tamperResult.anomalyIndicators,
            }
          : null,
        evidenceCodes: [authoritativeStatus, ...compositeResult.riskFactors],
      };

      const explanationResult = await generateExplanation(explanationInput);

      // Step 10: Format response with real UUID, dynamic ISO timestamp, and measured duration
      const durationMs = Math.max(
        0,
        Math.round((performance.now() - startTime) * 100) / 100,
      );
      const verificationId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // Structured logging without sensitive secrets or image content
      request.log.info(
        {
          verification_id: verificationId,
          endpoint: '/api/v1/verify',
          status: authoritativeStatus,
          provider: explanationResult.metadata.provider,
          duration_ms: durationMs,
          opt_in_audit: optInAudit ?? false,
        },
        'QR verification completed successfully',
      );

      const responseBody: VerifySuccessResponse = {
        verification_status: authoritativeStatus,
        decoded_payload: decoded.rawPayload,
        normalized_destination: compositeResult.evidence.destination.scannedDestination,
        registered_destination: compositeResult.matchedDestination,
        destination_match: compositeResult.destinationMatch,
        evidence: {
          normalized_scanned_destination:
            compositeResult.evidence.destination.scannedDestination,
          active_trusted_destinations_checked:
            compositeResult.evidence.destination.activeTrustedDestinationsChecked,
          exact_match: compositeResult.evidence.destination.exactMatch,
        },
        image_quality: {
          overall_quality: imageQualityResult.overallQuality,
          mean_brightness: imageQualityResult.meanBrightness,
          contrast_score: imageQualityResult.contrastScore,
          sharpness_score: imageQualityResult.sharpnessScore,
          dynamic_range: imageQualityResult.dynamicRange,
          brightness_classification: imageQualityResult.brightnessClassification,
          contrast_classification: imageQualityResult.contrastClassification,
          sharpness_classification: imageQualityResult.sharpnessClassification,
          quality_flags: imageQualityResult.qualityFlags,
        },
        composite_evidence: {
          destination: {
            scanned_destination: compositeResult.evidence.destination.scannedDestination,
            destination_match: compositeResult.evidence.destination.destinationMatch,
            active_trusted_destinations_checked:
              compositeResult.evidence.destination.activeTrustedDestinationsChecked,
            exact_match: compositeResult.evidence.destination.exactMatch,
          },
          image_quality: {
            overall_quality: compositeResult.evidence.imageQuality.overallQuality,
            brightness_classification:
              compositeResult.evidence.imageQuality.brightnessClassification,
            contrast_classification:
              compositeResult.evidence.imageQuality.contrastClassification,
            sharpness_classification:
              compositeResult.evidence.imageQuality.sharpnessClassification,
          },
          tamper: {
            available: tamperResult !== null,
            reference_available: referenceRecord !== null,
            ...(tamperResult
              ? {
                  analysis_quality: tamperResult.analysisQuality,
                  visual_deviation_index: tamperResult.visualDeviationIndex,
                  alignment_quality: tamperResult.alignmentQuality,
                  alignment_classification: tamperResult.alignmentClassification,
                  matrix_mismatch_ratio: tamperResult.matrixMismatchRatio,
                  boundary_anomaly_detected: tamperResult.boundaryAnomalyDetected,
                  boundary_anomaly_score: tamperResult.boundaryAnomalyScore,
                  anomaly_indicators: tamperResult.anomalyIndicators,
                  recommendation: tamperResult.recommendation,
                }
              : {}),
          },
        },
        risk_factors: compositeResult.riskFactors,
        recommendation: compositeResult.recommendation,
        explanation: explanationResult.explanation,
        explanation_metadata: {
          provider: explanationResult.metadata.provider,
          model: explanationResult.metadata.model,
        },
        processing_metadata: {
          verification_id: verificationId,
          timestamp,
          duration_ms: durationMs,
        },
      };

      return reply.status(200).send(responseBody);
    } catch (err: unknown) {
      if (err instanceof InvalidImageError) {
        return reply.status(400).send({
          error: {
            code: 'E_INVALID_IMAGE',
            message:
              err.message || 'The provided image is invalid or could not be decoded.',
            details:
              'The image file could not be parsed as a valid JPEG, PNG, or WebP image.',
          },
        });
      }

      if (err instanceof NoQrDetectedError) {
        return reply.status(422).send({
          error: {
            code: 'E_NO_QR_DETECTED',
            message: 'No readable QR code pattern was detected in the provided image.',
            details: 'Ensure the QR code is clearly visible and within the frame.',
          },
        });
      }

      if (err instanceof DecodeFailedError) {
        return reply.status(422).send({
          error: {
            code: 'E_DECODE_FAILED',
            message:
              'QR matrix was detected but could not be error-corrected or decoded.',
            details: 'The QR matrix is damaged, incomplete, or corrupted.',
          },
        });
      }

      if (err instanceof PaymentParserError) {
        return reply.status(422).send({
          error: {
            code: err.code,
            message: err.message,
            details: 'The decoded QR payload is not a valid payment payload.',
          },
        });
      }

      if (err instanceof ImageQualityError) {
        return reply.status(err.statusCode).send({
          error: {
            code: err.code,
            message: err.message,
            details: 'Image quality evaluation failed.',
          },
        });
      }

      if (err instanceof RegistryError) {
        request.log.error({ err }, 'Trusted registry lookup failed');
        return reply.status(503).send({
          error: {
            code: 'E_REGISTRY_UNAVAILABLE',
            message: 'Trusted registry service is currently unavailable.',
            details: 'Failed to retrieve trusted destination records.',
          },
        });
      }

      // Unexpected internal error
      request.log.error({ err }, 'Unexpected error during QR verification');
      return reply.status(500).send({
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'An unexpected internal error occurred during verification.',
          details: 'Internal processing error.',
        },
      });
    }
  });
}
