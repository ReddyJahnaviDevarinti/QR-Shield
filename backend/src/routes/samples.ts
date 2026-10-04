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

let cachedManifest: Manifest | null = null;

function loadManifest(): Manifest {
  if (cachedManifest) {
    return cachedManifest;
  }
  const dir = getSampleDataDir();
  const manifestPath = path.join(dir, 'manifest.json');
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  cachedManifest = JSON.parse(raw) as Manifest;
  return cachedManifest;
}

const SAMPLE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

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
    } catch {
      return reply.status(500).send({
        error: {
          code: 'E_SAMPLE_CATALOG_ERROR',
          message: 'Failed to load sample catalog.',
        },
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
      const { sampleId } = request.params;
      if (!sampleId || !SAMPLE_ID_REGEX.test(sampleId)) {
        return reply.status(400).send({
          error: {
            code: 'E_INVALID_SAMPLE_ID',
            message:
              'Invalid sample ID format. Must contain only alphanumeric characters, underscores, or dashes.',
          },
        });
      }

      try {
        const manifest = loadManifest();
        const sample = manifest.samples.find((s) => s.id === sampleId);

        if (!sample) {
          return reply.status(404).send({
            error: {
              code: 'E_SAMPLE_NOT_FOUND',
              message: `Sample with ID '${sampleId}' was not found.`,
            },
          });
        }

        return reply.status(200).send({ sample });
      } catch {
        return reply.status(500).send({
          error: {
            code: 'E_SAMPLE_CATALOG_ERROR',
            message: 'Failed to retrieve sample.',
          },
        });
      }
    },
  );

  /**
   * GET /api/v1/samples/:sampleId/image
   * Streams the actual sample image binary directly for offline or local preview.
   * Enforces strict path traversal defenses.
   */
  app.get<{ Params: { sampleId: string } }>(
    '/api/v1/samples/:sampleId/image',
    async (request, reply) => {
      const { sampleId } = request.params;
      if (!sampleId || !SAMPLE_ID_REGEX.test(sampleId)) {
        return reply.status(400).send({
          error: {
            code: 'E_INVALID_SAMPLE_ID',
            message: 'Invalid sample ID format.',
          },
        });
      }

      try {
        const manifest = loadManifest();
        const sample = manifest.samples.find((s) => s.id === sampleId);

        if (!sample) {
          return reply.status(404).send({
            error: {
              code: 'E_SAMPLE_NOT_FOUND',
              message: `Sample with ID '${sampleId}' was not found.`,
            },
          });
        }

        const dir = getSampleDataDir();
        const imagesDir = path.resolve(dir, 'images');
        const resolvedPath = path.resolve(imagesDir, sample.image_file);

        // Path traversal defense: ensure resolvedPath remains strictly inside imagesDir
        if (!resolvedPath.startsWith(imagesDir + path.sep)) {
          return reply.status(400).send({
            error: {
              code: 'E_INVALID_IMAGE_PATH',
              message: 'Invalid sample image path.',
            },
          });
        }

        if (!fs.existsSync(resolvedPath)) {
          return reply.status(404).send({
            error: {
              code: 'E_IMAGE_NOT_FOUND',
              message: `Sample image file '${sample.image_file}' not found on server disk.`,
            },
          });
        }

        const buffer = fs.readFileSync(resolvedPath);
        return reply
          .header('Content-Type', 'image/png')
          .header('Cache-Control', 'public, max-age=3600')
          .send(buffer);
      } catch {
        return reply.status(500).send({
          error: {
            code: 'E_SAMPLE_IMAGE_ERROR',
            message: 'Failed to stream sample image.',
          },
        });
      }
    },
  );
};
