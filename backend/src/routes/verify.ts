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
import type {
  CanonicalVerificationStatus,
  TrustedDestination,
} from '../modules/verification-engine/types.js';
import {
  findActiveTrustedDestinations,
  findActiveTrustedDestinationsForMerchant,
  type TrustedRegistryDestination,
} from '../integrations/trusted-registry/index.js';
import { RegistryError } from '../integrations/trusted-registry/errors.js';

/**
 * Permitted image MIME types per system specification.
 */
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Maximum permitted image size: 10 MB.
 */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Response structure for successful QR destination verification.
 */
export interface VerifySuccessResponse {
  verification_status: CanonicalVerificationStatus;
  decoded_payload: string;
  normalized_destination: string | null;
  registered_destination: string | null;
  destination_match: boolean;
  evidence: {
    normalized_scanned_destination: string | null;
    active_trusted_destinations_checked: number;
    exact_match: boolean;
  };
  risk_factors: string[];
  explanation: string;
  processing_metadata: {
    verification_id: string;
    timestamp: string;
    duration_ms: number;
  };
}

/**
 * Provides a factual, deterministic explanation from the verification result.
 * Gemini is NOT involved in deciding this canonical result.
 */
function getDeterministicExplanation(status: CanonicalVerificationStatus): string {
  switch (status) {
    case 'VERIFIED':
      return 'The scanned payment destination matches an active trusted registration.';
    case 'DESTINATION_MISMATCH':
      return 'The scanned payment destination conflicts with the active trusted destination for the selected merchant.';
    case 'UNVERIFIED':
      return 'No active trusted destination is available for comparison.';
    case 'INSUFFICIENT_EVIDENCE':
      return 'The available QR payload does not contain enough information for destination verification.';
  }
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

    // 4. Verification pipeline orchestration
    try {
      // Step 1: Decode QR code from in-memory image buffer
      const decoded = await decodeQr(imageBuffer);

      // Step 2: Parse payment payload
      const parsedPayload = parsePaymentPayload(decoded.rawPayload);

      // Step 3: Obtain relevant trusted registry destinations
      let registryRecords: TrustedRegistryDestination[] = [];

      if (parsedPayload.format === 'UPI_URI') {
        const destinationType = 'VPA';
        if (merchantId) {
          registryRecords = await findActiveTrustedDestinationsForMerchant(
            merchantId,
            destinationType,
          );
        } else {
          registryRecords = await findActiveTrustedDestinations(
            parsedPayload.paymentAddress,
            destinationType,
          );
        }
      } else if (parsedPayload.format === 'GENERIC_URL') {
        const destinationType = 'URL';
        if (merchantId) {
          registryRecords = await findActiveTrustedDestinationsForMerchant(
            merchantId,
            destinationType,
          );
        } else {
          registryRecords = await findActiveTrustedDestinations(
            parsedPayload.url,
            destinationType,
          );
        }
      }

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

      // Step 4: Run pure verification engine (canonical status decider)
      const verificationResult = verifyDestination(parsedPayload, trustedDestinations);

      // Step 5: Format response with real UUID, dynamic ISO timestamp, and measured duration
      const durationMs = Math.max(
        0,
        Math.round((performance.now() - startTime) * 100) / 100,
      );
      const verificationId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const explanation = getDeterministicExplanation(verificationResult.status);

      // Structured logging without sensitive secrets or image content
      request.log.info(
        {
          verification_id: verificationId,
          endpoint: '/api/v1/verify',
          status: verificationResult.status,
          duration_ms: durationMs,
          opt_in_audit: optInAudit ?? false,
        },
        'QR verification completed successfully',
      );

      const responseBody: VerifySuccessResponse = {
        verification_status: verificationResult.status,
        decoded_payload: decoded.rawPayload,
        normalized_destination: verificationResult.evidence.normalizedScannedDestination,
        registered_destination: verificationResult.matchedDestination,
        destination_match: verificationResult.destinationMatch,
        evidence: {
          normalized_scanned_destination:
            verificationResult.evidence.normalizedScannedDestination,
          active_trusted_destinations_checked:
            verificationResult.evidence.activeTrustedDestinationsChecked,
          exact_match: verificationResult.evidence.exactMatch,
        },
        risk_factors: [],
        explanation,
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
            message: 'The provided image is invalid or could not be decoded.',
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
