import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = buildApp();

async function startServer(): Promise<void> {
  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    app.log.info(
      `QRShield Backend API listening on http://${env.HOST}:${env.PORT} [${env.NODE_ENV}]`,
    );
  } catch (err) {
    app.log.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown handling (Task 12)
const shutdown = async (signal: string): Promise<void> => {
  app.log.info(`Received ${signal}, initiating graceful shutdown...`);
  try {
    await app.close();
    app.log.info('Server closed cleanly.');
    process.exit(0);
  } catch (err) {
    app.log.error(err, 'Error during graceful shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void startServer();
