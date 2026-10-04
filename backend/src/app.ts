import fastify, { FastifyError, FastifyInstance, FastifyServerOptions } from 'fastify';
import { env } from './config/env.js';
import { securityPlugin } from './plugins/security.js';
import { healthRoutes } from './routes/health.js';

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

    const message =
      isClientError || env.NODE_ENV !== 'production'
        ? error.message
        : 'An internal server error occurred.';

    reply.status(statusCode).send({
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
  app.register(healthRoutes);

  return app;
}
