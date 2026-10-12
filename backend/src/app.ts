import fastify, { FastifyError, FastifyInstance, FastifyServerOptions } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import { env } from './config/env.js';
import { securityPlugin, type RateLimitPluginOptions } from './plugins/security.js';
import { healthRoutes } from './routes/health.js';
import { verifyRoutes } from './routes/verify.js';
import { referenceQrRoutes } from './routes/reference-qr.js';
import { destinationRoutes } from './routes/destinations.js';
import { sampleRoutes } from './routes/samples.js';

export interface AppOptions extends FastifyServerOptions {
  rateLimit?: RateLimitPluginOptions;
}

export function buildApp(opts: AppOptions = {}): FastifyInstance {
  const { rateLimit: rateLimitOpts, ...serverOpts } = opts;

  const app = fastify({
    trustProxy: serverOpts.trustProxy ?? false,
    logger: {
      level: env.NODE_ENV === 'test' ? 'silent' : 'info',
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'req.headers["apikey"]',
        'body.password',
        'body.secret',
        'body.token',
        'body.key',
        'body.image',
        'body.file',
        '*.password',
        '*.secret',
        '*.token',
        '*.key',
        '*.buffer',
      ],
    },
    ...serverOpts,
  });

  // Centralized Error Handler (Task 11)
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode =
      error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    const isClientError = statusCode >= 400 && statusCode < 500;

    request.log.error(
      {
        err: {
          message: error.message,
          name: error.name,
          statusCode,
        },
      },
      'Unhandled request error',
    );

    if (error.code === 'FST_REQ_FILE_TOO_LARGE' || statusCode === 413) {
      return reply.status(413).send({
        error: {
          code: 'E_PAYLOAD_TOO_LARGE',
          message: 'Uploaded file exceeds maximum permitted limit of 10 MB.',
          details: 'The maximum allowed file size is 10 MB.',
        },
      });
    }

    if (
      statusCode === 429 ||
      error.code === 'FST_RATE_LIMIT' ||
      (error as unknown as { error?: { code?: string } }).error?.code ===
        'E_RATE_LIMIT_EXCEEDED'
    ) {
      const errorObj = (
        error as unknown as { error?: { message?: string; details?: string } }
      ).error;
      return reply.status(429).send({
        error: {
          code: 'E_RATE_LIMIT_EXCEEDED',
          message:
            errorObj?.message ||
            'Too many requests. Please slow down and try again shortly.',
          details:
            errorObj?.details ||
            'Rate limit quota exceeded. Please retry after cooldown period.',
        },
      });
    }

    const message =
      isClientError || env.NODE_ENV !== 'production'
        ? error.message
        : 'An internal server error occurred.';

    return reply.status(statusCode).send({
      status: 'error',
      statusCode,
      error: error.name || 'InternalServerError',
      message,
    });
  });

  // Centralized 404 Handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      status: 'error',
      statusCode: 404,
      error: 'NotFound',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  // Register core plugins
  app.register(securityPlugin, { rateLimit: rateLimitOpts });
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });
  app.register(healthRoutes);
  app.register(verifyRoutes);
  app.register(referenceQrRoutes);
  app.register(destinationRoutes);
  app.register(sampleRoutes);

  return app;
}
