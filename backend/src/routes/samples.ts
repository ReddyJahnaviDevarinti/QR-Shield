import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSampleDataDir(): string {
  const candidates = [
    path.resolve(__dirname, '../../../sample-data'),
    path.resolve(__dirname, '../../sample-data'),
    path.resolve(process.cwd(), 'sample-data'),
    path.resolve(process.cwd(), '../sample-data'),
  ];

  for (const candidate of candidates) {
    if (
      fs.existsSync(candidate) &&
      fs.existsSync(path.join(candidate, 'manifest.json'))
    ) {
      return candidate;
    }
  }

  throw new Error('Unable to locate sample-data directory.');
}

interface SampleRecord {
  id: string;
  name: string;
  category: string;
  expected_status: string;
  summary: string;
  description: string;
  creation_method: string;
  payload: string;
  image_file: string;
  storage_path: string;
  public_url: string;
  api_image_url: string;
  requires_merchant_context: boolean;
  merchant_id?: string;
  merchant_name?: string;
  expected_evidence: Record<string, unknown>;
}

interface Manifest {
  version: string;
  generated_at: string;
  description: string;
  samples: SampleRecord[];
}

function loadManifest(): Manifest {
  const dir = getSampleDataDir();
  const manifestPath = path.join(dir, 'manifest.json');
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw) as Manifest;
}

export const sampleRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * GET /api/v1/samples
   * Read-only catalog of evaluator benchmark samples.
   */
  app.get('/api/v1/samples', async (_request, reply) => {
    try {
      const manifest = loadManifest();
      return reply.status(200).send({
        version: manifest.version,
        generated_at: manifest.generated_at,
        description: manifest.description,
        samples: manifest.samples,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({
        status: 'error',
        statusCode: 500,
        error: 'SampleCatalogError',
        message: `Failed to load sample catalog: ${message}`,
      });
    }
  });

  /**
   * GET /api/v1/samples/:sampleId
   * Retrieve single sample definition.
   */
  app.get<{ Params: { sampleId: string } }>(
    '/api/v1/samples/:sampleId',
    async (request, reply) => {
      try {
        const manifest = loadManifest();
        const sample = manifest.samples.find((s) => s.id === request.params.sampleId);

        if (!sample) {
          return reply.status(404).send({
            status: 'error',
            statusCode: 404,
            error: 'NotFound',
            message: `Sample with ID '${request.params.sampleId}' was not found.`,
          });
        }

        return reply.status(200).send({ sample });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({
          status: 'error',
          statusCode: 500,
          error: 'SampleCatalogError',
          message: `Failed to retrieve sample: ${message}`,
        });
      }
    },
  );

  /**
   * GET /api/v1/samples/:sampleId/image
   * Streams the actual sample image binary directly for offline or local preview.
   */
  app.get<{ Params: { sampleId: string } }>(
    '/api/v1/samples/:sampleId/image',
    async (request, reply) => {
      try {
        const manifest = loadManifest();
        const sample = manifest.samples.find((s) => s.id === request.params.sampleId);

        if (!sample) {
          return reply.status(404).send({
            status: 'error',
            statusCode: 404,
            error: 'NotFound',
            message: `Sample with ID '${request.params.sampleId}' was not found.`,
          });
        }

        const dir = getSampleDataDir();
        const imagePath = path.join(dir, 'images', sample.image_file);

        if (!fs.existsSync(imagePath)) {
          return reply.status(404).send({
            status: 'error',
            statusCode: 404,
            error: 'NotFound',
            message: `Sample image file '${sample.image_file}' not found on server disk.`,
          });
        }

        const buffer = fs.readFileSync(imagePath);
        return reply
          .header('Content-Type', 'image/png')
          .header('Cache-Control', 'public, max-age=3600')
          .send(buffer);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({
          status: 'error',
          statusCode: 500,
          error: 'SampleImageError',
          message: `Failed to stream sample image: ${message}`,
        });
      }
    },
  );
};
