import { describe, it, expect } from 'vitest';
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
});
