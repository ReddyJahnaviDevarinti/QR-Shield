import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  version: string;
  uptime_seconds: number;
}

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/v1/health',
    async (_req: FastifyRequest, _reply: FastifyReply): Promise<HealthResponse> => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime_seconds: Math.floor(process.uptime()),
      };
    },
  );
}
