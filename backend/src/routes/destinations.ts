import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import {
  authenticateAndAuthorizeMerchant,
  merchantRateLimitConfig,
  UUID_REGEX,
} from '../plugins/auth-guard.js';
import {
  createDestinationForMerchant,
  deleteDestinationForMerchant,
  listDestinationsForMerchant,
  updateDestinationForMerchant,
  type RegistryDestinationType,
} from '../integrations/trusted-registry/index.js';

interface DestinationParams {
  merchantId: string;
  destinationId?: string;
}

interface DestinationCreateBody {
  destination_type?: string;
  destinationType?: string;
  destination_value?: string;
  destinationValue?: string;
  is_active?: boolean;
  isActive?: boolean;
}

interface DestinationUpdateBody {
  destination_type?: string;
  destinationType?: string;
  destination_value?: string;
  destinationValue?: string;
  is_active?: boolean;
  isActive?: boolean;
}

/**
 * Validates and normalizes destination payload.
 * Throws an Error with code and details if validation fails.
 */
function validateAndNormalizeDestination(
  rawType: unknown,
  rawValue: unknown,
): { destinationType: RegistryDestinationType; destinationValue: string } {
  if (
    typeof rawType !== 'string' ||
    !['VPA', 'URL', 'ACCOUNT'].includes(rawType.toUpperCase())
  ) {
    throw {
      code: 'E_INVALID_PAYLOAD',
      message: 'Invalid destination_type. Must be VPA, URL, or ACCOUNT.',
      details: 'Supported types: VPA, URL, ACCOUNT.',
    };
  }

  const destinationType = rawType.toUpperCase() as RegistryDestinationType;

  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    throw {
      code: 'E_INVALID_PAYLOAD',
      message: 'destination_value is required and cannot be empty.',
      details: 'A valid non-empty destination string must be supplied.',
    };
  }

  const trimmedValue = rawValue.trim();

  if (destinationType === 'VPA') {
    if (
      !trimmedValue.includes('@') ||
      trimmedValue.startsWith('@') ||
      trimmedValue.endsWith('@') ||
      trimmedValue.split('@').length !== 2
    ) {
      throw {
        code: 'E_INVALID_PAYLOAD',
        message: `Invalid Virtual Payment Address format "${trimmedValue}".`,
        details: 'Expected standard UPI format such as "handle@bank".',
      };
    }
    return {
      destinationType,
      destinationValue: trimmedValue.toLowerCase(),
    };
  }

  if (destinationType === 'URL') {
    try {
      const parsedUrl = new URL(trimmedValue);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Protocol must be http or https.');
      }
      if (!parsedUrl.hostname) {
        throw new Error('URL hostname is required.');
      }
    } catch {
      throw {
        code: 'E_INVALID_PAYLOAD',
        message: `Invalid URL destination "${trimmedValue}".`,
        details: 'URL must be a valid HTTP or HTTPS address.',
      };
    }
    return {
      destinationType,
      destinationValue: trimmedValue,
    };
  }

  // ACCOUNT
  if (trimmedValue.length < 3 || trimmedValue.length > 64) {
    throw {
      code: 'E_INVALID_PAYLOAD',
      message: `Invalid account destination "${trimmedValue}".`,
      details: 'Account identifier must be between 3 and 64 characters.',
    };
  }

  return {
    destinationType,
    destinationValue: trimmedValue,
  };
}

export const destinationRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // GET /api/v1/merchants/:merchantId/destinations
  app.get(
    '/api/v1/merchants/:merchantId/destinations',
    merchantRateLimitConfig,
    async (
      request: FastifyRequest<{ Params: DestinationParams }>,
      reply: FastifyReply,
    ) => {
      const { merchantId } = request.params;
      if (!merchantId || merchantId.trim().length === 0) {
        return reply.status(400).send({
          error: {
            code: 'E_INVALID_MERCHANT_ID',
            message: 'A valid merchantId must be provided in the URL path.',
          },
        });
      }

      const authCtx = await authenticateAndAuthorizeMerchant(request, reply, merchantId);
      if (!authCtx) {
        return;
      }

      try {
        const destinations = await listDestinationsForMerchant(authCtx.merchantId);
        return reply.status(200).send({ destinations });
      } catch (err: unknown) {
        request.log.error({ err }, 'Failed to list merchant destinations');
        return reply.status(500).send({
          error: {
            code: 'E_DATABASE_ERROR',
            message: 'Failed to retrieve merchant payment destinations.',
          },
        });
      }
    },
  );

  // POST /api/v1/merchants/:merchantId/destinations
  app.post(
    '/api/v1/merchants/:merchantId/destinations',
    merchantRateLimitConfig,
    async (
      request: FastifyRequest<{ Params: DestinationParams; Body: DestinationCreateBody }>,
      reply: FastifyReply,
    ) => {
      const { merchantId } = request.params;
      if (!merchantId || merchantId.trim().length === 0) {
        return reply.status(400).send({
          error: {
            code: 'E_INVALID_MERCHANT_ID',
            message: 'A valid merchantId must be provided in the URL path.',
          },
        });
      }

      const authCtx = await authenticateAndAuthorizeMerchant(request, reply, merchantId);
      if (!authCtx) {
        return;
      }

      const body = request.body || {};
      const rawType = body.destination_type || body.destinationType;
      const rawValue = body.destination_value || body.destinationValue;
      const isActive =
        body.is_active !== undefined
          ? Boolean(body.is_active)
          : body.isActive !== undefined
            ? Boolean(body.isActive)
            : true;

      let validated: {
        destinationType: RegistryDestinationType;
        destinationValue: string;
      };
      try {
        validated = validateAndNormalizeDestination(rawType, rawValue);
      } catch (validationErr: unknown) {
        const errObj = validationErr as {
          code?: string;
          message?: string;
          details?: string;
        };
        return reply.status(400).send({
          error: {
            code: errObj.code || 'E_INVALID_PAYLOAD',
            message: errObj.message || 'Invalid destination payload.',
            details: errObj.details,
          },
        });
      }

      try {
        const destination = await createDestinationForMerchant(authCtx.merchantId, {
          destinationType: validated.destinationType,
          destinationValue: validated.destinationValue,
          isActive,
        });

        return reply.status(201).send({ destination });
      } catch (err: unknown) {
        request.log.error({ err }, 'Failed to create payment destination');
        return reply.status(500).send({
          error: {
            code: 'E_DATABASE_ERROR',
            message: 'Failed to create payment destination.',
          },
        });
      }
    },
  );

  // PUT /api/v1/merchants/:merchantId/destinations/:destinationId
  app.put(
    '/api/v1/merchants/:merchantId/destinations/:destinationId',
    merchantRateLimitConfig,
    async (
      request: FastifyRequest<{ Params: DestinationParams; Body: DestinationUpdateBody }>,
      reply: FastifyReply,
    ) => {
      const { merchantId, destinationId } = request.params;
      if (!merchantId || merchantId.trim().length === 0) {
        return reply.status(400).send({
          error: {
            code: 'E_INVALID_MERCHANT_ID',
            message: 'A valid merchantId must be provided in the URL path.',
          },
        });
      }

      if (!destinationId || !UUID_REGEX.test(destinationId.trim())) {
        return reply.status(404).send({
          error: {
            code: 'E_DESTINATION_NOT_FOUND',
            message: 'Payment destination not found.',
          },
        });
      }

      const authCtx = await authenticateAndAuthorizeMerchant(request, reply, merchantId);
      if (!authCtx) {
        return;
      }

      const body = request.body || {};
      const rawType = body.destination_type || body.destinationType;
      const rawValue = body.destination_value || body.destinationValue;
      const hasActive = body.is_active !== undefined || body.isActive !== undefined;
      const isActive =
        body.is_active !== undefined
          ? Boolean(body.is_active)
          : body.isActive !== undefined
            ? Boolean(body.isActive)
            : undefined;

      if (rawType === undefined && rawValue === undefined && !hasActive) {
        return reply.status(400).send({
          error: {
            code: 'E_INVALID_PAYLOAD',
            message:
              'At least one field (destination_value, is_active, destination_type) must be provided.',
          },
        });
      }

      const updates: {
        destinationValue?: string;
        isActive?: boolean;
        destinationType?: RegistryDestinationType;
      } = {};

      if (hasActive) {
        updates.isActive = isActive;
      }

      if (rawValue !== undefined || rawType !== undefined) {
        const typeToUse = rawType || (rawValue?.includes('@') ? 'VPA' : 'URL');
        try {
          const validated = validateAndNormalizeDestination(
            typeToUse,
            rawValue ?? 'dummy@bank',
          );
          if (rawValue !== undefined) {
            updates.destinationValue = validated.destinationValue;
          }
          if (rawType !== undefined) {
            updates.destinationType = validated.destinationType;
          }
        } catch (validationErr: unknown) {
          const errObj = validationErr as {
            code?: string;
            message?: string;
            details?: string;
          };
          return reply.status(400).send({
            error: {
              code: errObj.code || 'E_INVALID_PAYLOAD',
              message: errObj.message || 'Invalid destination payload.',
              details: errObj.details,
            },
          });
        }
      }

      try {
        const updated = await updateDestinationForMerchant(
          authCtx.merchantId,
          destinationId.trim(),
          updates,
        );

        if (!updated) {
          return reply.status(404).send({
            error: {
              code: 'E_DESTINATION_NOT_FOUND',
              message: 'Payment destination not found.',
            },
          });
        }

        return reply.status(200).send({ destination: updated });
      } catch (err: unknown) {
        request.log.error({ err }, 'Failed to update payment destination');
        return reply.status(500).send({
          error: {
            code: 'E_DATABASE_ERROR',
            message: 'Failed to update payment destination.',
          },
        });
      }
    },
  );

  // DELETE /api/v1/merchants/:merchantId/destinations/:destinationId
  app.delete(
    '/api/v1/merchants/:merchantId/destinations/:destinationId',
    merchantRateLimitConfig,
    async (
      request: FastifyRequest<{ Params: DestinationParams }>,
      reply: FastifyReply,
    ) => {
      const { merchantId, destinationId } = request.params;
      if (!merchantId || merchantId.trim().length === 0) {
        return reply.status(400).send({
          error: {
            code: 'E_INVALID_MERCHANT_ID',
            message: 'A valid merchantId must be provided in the URL path.',
          },
        });
      }

      if (!destinationId || !UUID_REGEX.test(destinationId.trim())) {
        return reply.status(404).send({
          error: {
            code: 'E_DESTINATION_NOT_FOUND',
            message: 'Payment destination not found.',
          },
        });
      }

      const authCtx = await authenticateAndAuthorizeMerchant(request, reply, merchantId);
      if (!authCtx) {
        return;
      }

      try {
        await deleteDestinationForMerchant(authCtx.merchantId, destinationId.trim());
        return reply.status(200).send({
          success: true,
          message: 'Payment destination deleted successfully.',
        });
      } catch (err: unknown) {
        request.log.error({ err }, 'Failed to delete payment destination');
        return reply.status(500).send({
          error: {
            code: 'E_DATABASE_ERROR',
            message: 'Failed to delete payment destination.',
          },
        });
      }
    },
  );
};
