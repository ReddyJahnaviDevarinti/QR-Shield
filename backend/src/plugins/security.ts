import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';

async function securityPluginImpl(app: FastifyInstance): Promise<void> {
  // Security headers via Helmet
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false,
  });

  // Strict CORS policy
  await app.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, health checks)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      const corsError = new Error('Not allowed by CORS');
      (corsError as unknown as { statusCode: number }).statusCode = 403;
      (corsError as unknown as { name: string }).name = 'Forbidden';
      callback(corsError, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
}

export const securityPlugin = fp(securityPluginImpl, {
  name: 'securityPlugin',
});
