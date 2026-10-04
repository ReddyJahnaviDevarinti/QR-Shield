import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Frontend Security & Isolation Tests', () => {
  const DEMO_MERCHANT_ID = '51bc512c-7945-4404-bd24-4316ce924daa';
  const srcDir = path.resolve(__dirname, '../src');

  function getAllFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        getAllFiles(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    }
    return fileList;
  }

  const allSrcFiles = getAllFiles(srcDir);
  const productionSrcFiles = allSrcFiles.filter(
    (f) => !f.includes('.test.') && !f.includes('__tests__'),
  );

  it('13. ensures no hard-coded demo merchant ID exists in frontend production logic', () => {
    const offendingFiles: string[] = [];

    for (const file of productionSrcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(DEMO_MERCHANT_ID)) {
        offendingFiles.push(path.relative(srcDir, file));
      }
    }

    expect(
      offendingFiles,
      `Found hardcoded demo merchant ID in: ${offendingFiles.join(', ')}`,
    ).toEqual([]);
  });

  it('14. ensures no Supabase secret/service-role key appears in frontend source', () => {
    const forbiddenPatterns = [
      'SUPABASE_SECRET_KEY',
      'service_role',
      'serviceRole',
      'sb_secret',
    ];

    const offendingFiles: string[] = [];

    for (const file of productionSrcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of forbiddenPatterns) {
        if (content.includes(pattern)) {
          offendingFiles.push(`${path.relative(srcDir, file)} contains "${pattern}"`);
        }
      }
    }

    expect(
      offendingFiles,
      `Found backend secret references in frontend: ${offendingFiles.join(', ')}`,
    ).toEqual([]);
  });

  // ==================================================
  // PROMPT 021A PART 12 — FRONTEND SECURITY TESTS
  // ==================================================

  it('21. reference API sends Authorization header', async () => {
    let capturedHeaders: Record<string, string> | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_url: RequestInfo | URL, options?: RequestInit) => {
        capturedHeaders = options?.headers as Record<string, string>;
        return new Response(JSON.stringify({ reference_qr: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    );

    const { fetchReferenceQr } = await import('./lib/api');
    await fetchReferenceQr('merch-test-id', 'test-jwt-token');
    expect(capturedHeaders?.['Authorization']).toBe('Bearer test-jwt-token');
  });

  it('22. upload sends Authorization header', async () => {
    let capturedHeaders: Record<string, string> | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_url: RequestInfo | URL, options?: RequestInit) => {
        capturedHeaders = options?.headers as Record<string, string>;
        return new Response(
          JSON.stringify({
            reference_qr: {
              id: 'ref-1',
              merchant_id: 'm-1',
              storage_path: 'm-1/ref.png',
              payload_hash: 'hash',
              raw_payload: 'upi://pay',
              uploaded_at: new Date().toISOString(),
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      },
    );

    const { uploadReferenceQr } = await import('./lib/api');
    const file = new File(['qr-bytes'], 'qr.png', { type: 'image/png' });
    await uploadReferenceQr('m-1', file, 'upload-jwt-token');
    expect(capturedHeaders?.['Authorization']).toBe('Bearer upload-jwt-token');
  });

  it('23. delete sends Authorization header', async () => {
    let capturedHeaders: Record<string, string> | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_url: RequestInfo | URL, options?: RequestInit) => {
        capturedHeaders = options?.headers as Record<string, string>;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    );

    const { deleteReferenceQr } = await import('./lib/api');
    await deleteReferenceQr('m-1', 'delete-jwt-token');
    expect(capturedHeaders?.['Authorization']).toBe('Bearer delete-jwt-token');
  });

  it('24. fetch sends Authorization header', async () => {
    let capturedHeaders: Record<string, string> | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_url: RequestInfo | URL, options?: RequestInit) => {
        capturedHeaders = options?.headers as Record<string, string>;
        return new Response(JSON.stringify({ reference_qr: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    );

    const { fetchReferenceQr } = await import('./lib/api');
    await fetchReferenceQr('m-1', 'fetch-jwt-token');
    expect(capturedHeaders?.['Authorization']).toBe('Bearer fetch-jwt-token');
  });

  it('25. no Supabase secret/service-role key appears in frontend source', () => {
    const forbiddenPatterns = [
      'SUPABASE_SECRET_KEY',
      'service_role',
      'serviceRole',
      'sb_secret',
    ];

    const offendingFiles: string[] = [];
    for (const file of productionSrcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of forbiddenPatterns) {
        if (content.includes(pattern)) {
          offendingFiles.push(`${path.relative(srcDir, file)} contains "${pattern}"`);
        }
      }
    }
    expect(offendingFiles).toEqual([]);
  });

  it('26. no hard-coded merchant UUID appears in frontend source', () => {
    // Regex matching standard UUID v4 format
    const uuidRegex =
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
    const offendingFiles: string[] = [];

    for (const file of productionSrcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(uuidRegex);
      if (matches && matches.length > 0) {
        offendingFiles.push(
          `${path.relative(srcDir, file)} contains UUID(s): ${matches.join(', ')}`,
        );
      }
    }

    expect(offendingFiles).toEqual([]);
  });
});
