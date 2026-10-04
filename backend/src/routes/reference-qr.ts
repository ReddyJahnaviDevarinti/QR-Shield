import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import crypto from 'crypto';
import { decodeQr } from '../modules/qr-decoder/decoder.js';
import {
  createReferenceQrPreviewUrl,
  deleteReferenceQrForMerchant,
  findActiveReferenceQrForMerchant,
  saveReferenceQr,
} from '../integrations/trusted-registry/index.js';
import { supabaseServer } from '../integrations/supabase/client.js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AuthenticatedMerchantContext {
  userId: string;
  merchantId: string;
}

/**
 * Authenticates the caller via Supabase Auth bearer token and authorizes
 * that the authenticated user owns the requested merchant profile.
 *
 * Safety Invariant:
 * - Must be called BEFORE any privileged database read/write or Storage operation.
 * - Rejects unauthenticated callers with 401 E_UNAUTHORIZED.
 * - Rejects non-owners with 403 E_FORBIDDEN without leaking merchant details.
 * - Rejects non-existent merchants with 404 E_MERCHANT_NOT_FOUND.
 */
async function authenticateAndAuthorizeMerchant(
  request: FastifyRequest,
  reply: FastifyReply,
  merchantId: string,
): Promise<AuthenticatedMerchantContext | null> {
  const authHeader = request.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    reply.status(401).send({
      error: {
        code: 'E_UNAUTHORIZED',
        message: 'Missing Authorization header. Bearer token required.',
      },
    });
    return null;
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer' || !parts[1]) {
    reply.status(401).send({
      error: {
        code: 'E_UNAUTHORIZED',
        message: 'Malformed Authorization header. Format: Bearer <token>.',
      },
    });
    return null;
  }

  const token = parts[1];

  let authenticatedUserId: string;
  try {
    const { data: userData, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !userData?.user?.id) {
      reply.status(401).send({
        error: {
          code: 'E_UNAUTHORIZED',
          message: 'Invalid or expired authentication token.',
        },
      });
      return null;
    }
    authenticatedUserId = userData.user.id;
  } catch {
    reply.status(401).send({
      error: {
        code: 'E_UNAUTHORIZED',
        message: 'Authentication failed.',
      },
    });
    return null;
  }

  const trimmedMerchantId = merchantId.trim();
  if (!UUID_REGEX.test(trimmedMerchantId)) {
    reply.status(404).send({
      error: {
        code: 'E_MERCHANT_NOT_FOUND',
        message: 'Merchant profile not found.',
      },
    });
    return null;
  }

  try {
    const { data: merchantData, error: merchantError } = await supabaseServer
      .from('merchants')
      .select('id, user_id')
      .eq('id', trimmedMerchantId)
      .maybeSingle();

    if (merchantError) {
      request.log.error(
        { err: merchantError },
        'Database error resolving merchant profile',
      );
      reply.status(500).send({
        error: {
          code: 'E_DATABASE_ERROR',
          message: 'Failed to verify merchant ownership.',
        },
      });
      return null;
    }

    if (!merchantData) {
      reply.status(404).send({
        error: {
          code: 'E_MERCHANT_NOT_FOUND',
          message: 'Merchant profile not found.',
        },
      });
      return null;
    }

    const row = merchantData as { id: string; user_id: string };
    if (row.user_id !== authenticatedUserId) {
      reply.status(403).send({
        error: {
          code: 'E_FORBIDDEN',
          message: 'Caller does not own this merchant profile.',
        },
      });
      return null;
    }

    return {
      userId: authenticatedUserId,
      merchantId: row.id,
    };
  } catch (err: unknown) {
    request.log.error({ err }, 'Unexpected error resolving merchant profile');
    reply.status(500).send({
      error: {
        code: 'E_INTERNAL_ERROR',
        message: 'Internal error resolving merchant ownership.',
      },
    });
    return null;
  }
}

export const referenceQrRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // GET /api/v1/merchants/:merchantId/reference-qr
  app.get('/api/v1/merchants/:merchantId/reference-qr', async (request, reply) => {
    const { merchantId } = request.params as { merchantId: string };

    if (!merchantId || merchantId.trim().length === 0) {
      return reply.status(400).send({
        error: {
          code: 'E_INVALID_MERCHANT_ID',
          message: 'A valid merchantId must be provided in the URL path.',
        },
      });
    }

    // Security Gate: Authenticate token and authorize merchant ownership before privileged read
    const authCtx = await authenticateAndAuthorizeMerchant(request, reply, merchantId);
    if (!authCtx) {
      return;
    }

    const trimmedMerchantId = merchantId.trim();
    const record = await findActiveReferenceQrForMerchant(trimmedMerchantId);

    if (!record) {
      return reply.status(200).send({
        reference_qr: null,
      });
    }

    const previewUrl = await createReferenceQrPreviewUrl(record.storagePath, 300);

    return reply.status(200).send({
      reference_qr: {
        id: record.id,
        merchant_id: record.merchantId,
        storage_path: record.storagePath,
        payload_hash: record.payloadHash,
        raw_payload: record.rawPayload,
        uploaded_at: record.uploadedAt,
        preview_url: previewUrl,
      },
    });
  });

  // POST /api/v1/merchants/:merchantId/reference-qr
  app.post('/api/v1/merchants/:merchantId/reference-qr', async (request, reply) => {
    const { merchantId } = request.params as { merchantId: string };

    if (!merchantId || merchantId.trim().length === 0) {
      return reply.status(400).send({
        error: {
          code: 'E_INVALID_MERCHANT_ID',
          message: 'A valid merchantId must be provided in the URL path.',
        },
      });
    }

    // Security Gate: Authenticate token and authorize merchant ownership before ANY processing or Storage mutation
    const authCtx = await authenticateAndAuthorizeMerchant(request, reply, merchantId);
    if (!authCtx) {
      return;
    }

    const trimmedMerchantId = merchantId.trim();

    if (!request.isMultipart()) {
      return reply.status(400).send({
        error: {
          code: 'E_INVALID_CONTENT_TYPE',
          message: 'Request Content-Type must be multipart/form-data.',
          details:
            'Upload reference image using multipart/form-data with field name "image".',
        },
      });
    }

    let imageBuffer: Buffer | null = null;
    let imageMimeType: string | null = null;
    let isTruncated = false;

    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
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
          },
        });
      }
      return reply.status(400).send({
        error: {
          code: 'E_MALFORMED_MULTIPART',
          message: 'Malformed multipart/form-data request.',
        },
      });
    }

    if (isTruncated || (imageBuffer && imageBuffer.length > MAX_FILE_SIZE_BYTES)) {
      return reply.status(413).send({
        error: {
          code: 'E_PAYLOAD_TOO_LARGE',
          message: 'Uploaded file exceeds maximum permitted limit of 10 MB.',
        },
      });
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return reply.status(400).send({
        error: {
          code: 'E_EMPTY_IMAGE',
          message: 'Uploaded image file is empty or missing.',
          details: 'Provide a valid image under form field "image".',
        },
      });
    }

    if (!imageMimeType || !ALLOWED_MIME_TYPES.has(imageMimeType)) {
      return reply.status(400).send({
        error: {
          code: 'E_UNSUPPORTED_MIME_TYPE',
          message: `Unsupported image MIME type '${imageMimeType ?? 'unknown'}'. Allowed formats: image/jpeg, image/png, image/webp.`,
        },
      });
    }

    // Deterministic validation: must contain a detectable, error-corrected QR code (Part 7)
    let decoded;
    try {
      decoded = await decodeQr(imageBuffer);
    } catch {
      return reply.status(422).send({
        error: {
          code: 'E_UNREADABLE_REFERENCE_QR',
          message: 'Reference QR could not be established. Upload a clear QR image.',
          details:
            'The uploaded reference image did not contain a detectable, readable QR code pattern.',
        },
      });
    }

    // Deterministic payload hash
    const payloadHash = crypto
      .createHash('sha256')
      .update(decoded.rawPayload)
      .digest('hex');

    // Safe deterministic storage path: <merchantId>/reference-qr-<timestamp>.<ext>
    const ext =
      imageMimeType === 'image/jpeg'
        ? 'jpg'
        : imageMimeType === 'image/webp'
          ? 'webp'
          : 'png';
    const storagePath = `${trimmedMerchantId}/reference-qr-${Date.now()}.${ext}`;

    // Upload to private reference-qrs bucket
    const { error: uploadError } = await supabaseServer.storage
      .from('reference-qrs')
      .upload(storagePath, imageBuffer, {
        contentType: imageMimeType,
        upsert: true,
      });

    if (uploadError) {
      request.log.error({ err: uploadError }, 'Failed to upload reference QR to storage');
      return reply.status(500).send({
        error: {
          code: 'E_STORAGE_UPLOAD_FAILED',
          message: 'Failed to securely store reference QR image in private storage.',
        },
      });
    }

    // Create database record
    try {
      // Find old records to clean up after successful insertion
      const oldRecords = await findActiveReferenceQrForMerchant(trimmedMerchantId);

      const record = await saveReferenceQr({
        merchantId: trimmedMerchantId,
        storagePath,
        payloadHash,
        rawPayload: decoded.rawPayload,
        finderCoordinates: decoded.location,
      });

      // Cleanup prior records/files if they differ
      if (oldRecords && oldRecords.id !== record.id) {
        try {
          await supabaseServer
            .from('reference_qrs')
            .delete()
            .eq('merchant_id', trimmedMerchantId)
            .neq('id', record.id);

          if (oldRecords.storagePath !== storagePath) {
            await supabaseServer.storage
              .from('reference-qrs')
              .remove([oldRecords.storagePath]);
          }
        } catch {
          // Non-fatal cleanup failure
        }
      }

      const previewUrl = await createReferenceQrPreviewUrl(record.storagePath, 300);

      return reply.status(201).send({
        reference_qr: {
          id: record.id,
          merchant_id: record.merchantId,
          storage_path: record.storagePath,
          payload_hash: record.payloadHash,
          raw_payload: record.rawPayload,
          uploaded_at: record.uploadedAt,
          preview_url: previewUrl,
        },
      });
    } catch (dbErr: unknown) {
      // Partial failure safety: cleanup uploaded storage object if DB insert failed
      try {
        await supabaseServer.storage.from('reference-qrs').remove([storagePath]);
      } catch {
        // Best effort cleanup
      }

      request.log.error({ err: dbErr }, 'Failed to save reference_qrs database record');
      return reply.status(500).send({
        error: {
          code: 'E_DATABASE_INSERT_FAILED',
          message: 'Failed to register reference QR record in database.',
        },
      });
    }
  });

  // DELETE /api/v1/merchants/:merchantId/reference-qr
  app.delete('/api/v1/merchants/:merchantId/reference-qr', async (request, reply) => {
    const { merchantId } = request.params as { merchantId: string };

    if (!merchantId || merchantId.trim().length === 0) {
      return reply.status(400).send({
        error: {
          code: 'E_INVALID_MERCHANT_ID',
          message: 'A valid merchantId must be provided in the URL path.',
        },
      });
    }

    // Security Gate: Authenticate token and authorize merchant ownership before ANY deletion
    const authCtx = await authenticateAndAuthorizeMerchant(request, reply, merchantId);
    if (!authCtx) {
      return;
    }

    const trimmedMerchantId = merchantId.trim();

    try {
      const summary = await deleteReferenceQrForMerchant(trimmedMerchantId);
      return reply.status(200).send({
        success: true,
        message: 'Reference QR removed successfully.',
        deleted_count: summary.deletedRecords,
      });
    } catch (err: unknown) {
      request.log.error({ err }, 'Failed to delete reference QR');
      return reply.status(500).send({
        error: {
          code: 'E_DELETE_FAILED',
          message: 'Failed to delete reference QR.',
        },
      });
    }
  });
};
