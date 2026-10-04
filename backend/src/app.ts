import fastify, { FastifyError, FastifyInstance, FastifyServerOptions } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import { env } from './config/env.js';
import { securityPlugin } from './plugins/security.js';
import { healthRoutes } from './routes/health.js';
import { verifyRoutes } from './routes/verify.js';
import { referenceQrRoutes } from './routes/reference-qr.js';
import { sampleRoutes } from './routes/samples.js';

export function buildApp(opts: FastifyServerOptions = {}): FastifyInstance {
  const app = fastify({
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
    ...opts,
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
  app.register(securityPlugin);
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });
  app.register(healthRoutes);
  app.register(verifyRoutes);
  app.register(referenceQrRoutes);
  app.register(sampleRoutes);

  return app;
}
