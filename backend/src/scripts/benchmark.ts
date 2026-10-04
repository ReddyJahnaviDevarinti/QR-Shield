import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { decodeQr } from '../modules/qr-decoder/decoder.js';
import { analyzeImageQuality } from '../modules/image-quality/analyzer.js';
import { analyzeQrVisualDifference } from '../modules/tamper-analysis/analyzer.js';
import { parsePaymentPayload } from '../modules/payment-parser/parser.js';
import { verifyDestination } from '../modules/verification-engine/engine.js';
import { composeVerificationResult } from '../modules/composite-verification/engine.js';
import type { TrustedDestination } from '../modules/verification-engine/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSampleImagePath(fileName: string): string {
  const candidates = [
    path.resolve(__dirname, '../../../sample-data/images', fileName),
    path.resolve(__dirname, '../../sample-data/images', fileName),
    path.resolve(process.cwd(), 'sample-data/images', fileName),
    path.resolve(process.cwd(), '../sample-data/images', fileName),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(`Sample image '${fileName}' not found.`);
}

interface BenchmarkStats {
  name: string;
  iterations: number;
  minMs: number;
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
}

function calculateStats(name: string, times: number[]): BenchmarkStats {
  times.sort((a, b) => a - b);
  const sum = times.reduce((acc, t) => acc + t, 0);
  const mean = sum / times.length;
  const min = times[0] ?? 0;
  const max = times[times.length - 1] ?? 0;
  const median = times[Math.floor(times.length * 0.5)] ?? 0;
  const p95 = times[Math.floor(times.length * 0.95)] ?? 0;

  return {
    name,
    iterations: times.length,
    minMs: Math.round(min * 100) / 100,
    meanMs: Math.round(mean * 100) / 100,
    medianMs: Math.round(median * 100) / 100,
    p95Ms: Math.round(p95 * 100) / 100,
    maxMs: Math.round(max * 100) / 100,
  };
}

async function runBenchmark(): Promise<void> {
  console.log('='.repeat(78));
  console.log('QRSHIELD PERFORMANCE BENCHMARK SUITE');
  console.log(
    `Node Runtime: ${process.version} | Platform: ${process.platform} ${process.arch}`,
  );
  console.log(`Timestamp   : ${new Date().toISOString()}`);
  console.log('='.repeat(78));

  const verifiedImagePath = getSampleImagePath('sample-01-verified.png');
  const verifiedBuffer = fs.readFileSync(verifiedImagePath);

  const iterations = 50;

  // 1. QR Decoding Benchmark
  console.log(`\n[1/5] Benchmarking QR Decoding (${iterations} iterations)...`);
  // Warmup
  await decodeQr(verifiedBuffer);
  const decodeTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await decodeQr(verifiedBuffer);
    decodeTimes.push(performance.now() - t0);
  }
  const decodeStats = calculateStats('1. QR Decoding (decodeQr)', decodeTimes);

  // 2. Image Quality Analyzer Benchmark
  console.log(`[2/5] Benchmarking Image Quality Analysis (${iterations} iterations)...`);
  // Warmup
  await analyzeImageQuality(verifiedBuffer);
  const qualityTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await analyzeImageQuality(verifiedBuffer);
    qualityTimes.push(performance.now() - t0);
  }
  const qualityStats = calculateStats(
    '2. Image Quality (analyzeImageQuality)',
    qualityTimes,
  );

  // 3. Physical Tamper Analysis Benchmark
  console.log(
    `[3/5] Benchmarking Physical Tamper Analysis (${iterations} iterations)...`,
  );
  // Warmup
  await analyzeQrVisualDifference(verifiedBuffer, verifiedBuffer);
  const tamperTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await analyzeQrVisualDifference(verifiedBuffer, verifiedBuffer);
    tamperTimes.push(performance.now() - t0);
  }
  const tamperStats = calculateStats(
    '3. Tamper Analysis (analyzeQrVisualDifference)',
    tamperTimes,
  );

  // 4. Registry & Destination Verification Benchmark
  console.log(
    `[4/5] Benchmarking Destination Matching (${iterations * 10} iterations)...`,
  );
  const parsed = parsePaymentPayload(
    'upi://pay?pa=qrshield-sample@icici&pn=QRShield%20Sample&mc=5411',
  );
  const trusted: TrustedDestination[] = [
    {
      merchantId: '51bc512c-7945-4404-bd24-4316ce924daa',
      destinationType: 'VPA',
      destinationValue: 'qrshield-sample@icici',
      isActive: true,
    },
    {
      merchantId: '51bc512c-7945-4404-bd24-4316ce924daa',
      destinationType: 'URL',
      destinationValue: 'https://qrshield.example.com',
      isActive: true,
    },
  ];
  // Warmup
  verifyDestination(parsed, trusted);
  const destTimes: number[] = [];
  for (let i = 0; i < iterations * 10; i++) {
    const t0 = performance.now();
    verifyDestination(parsed, trusted);
    destTimes.push(performance.now() - t0);
  }
  const destStats = calculateStats(
    '4. Destination Matching (verifyDestination)',
    destTimes,
  );

  // 5. Composite Engine Benchmark
  console.log(`[5/5] Benchmarking Composite Engine (${iterations * 10} iterations)...`);
  const destResult = verifyDestination(parsed, trusted);
  const qualResult = await analyzeImageQuality(verifiedBuffer);
  const tampResult = await analyzeQrVisualDifference(verifiedBuffer, verifiedBuffer);

  // Warmup
  composeVerificationResult(destResult, qualResult, tampResult);
  const compositeTimes: number[] = [];
  for (let i = 0; i < iterations * 10; i++) {
    const t0 = performance.now();
    composeVerificationResult(destResult, qualResult, tampResult);
    compositeTimes.push(performance.now() - t0);
  }
  const compositeStats = calculateStats(
    '5. Composite Engine (composeVerificationResult)',
    compositeTimes,
  );

  // Print Summary Table
  const allStats = [decodeStats, qualityStats, tamperStats, destStats, compositeStats];
  console.log('\n' + '='.repeat(78));
  console.log('DETERMINISTIC BENCHMARK RESULTS SUMMARY (in milliseconds)');
  console.log('='.repeat(78));
  console.log(
    'Component'.padEnd(46) +
      'Mean'.padStart(8) +
      'Median'.padStart(8) +
      'p95'.padStart(8) +
      'Min'.padStart(8) +
      'Max'.padStart(8),
  );
  console.log('-'.repeat(78));

  for (const s of allStats) {
    console.log(
      s.name.padEnd(46) +
        `${s.meanMs}ms`.padStart(8) +
        `${s.medianMs}ms`.padStart(8) +
        `${s.p95Ms}ms`.padStart(8) +
        `${s.minMs}ms`.padStart(8) +
        `${s.maxMs}ms`.padStart(8),
    );
  }
  console.log('='.repeat(78));

  // Compute Total Deterministic Pipeline Duration
  const totalMeanMs =
    Math.round(
      (decodeStats.meanMs +
        qualityStats.meanMs +
        tamperStats.meanMs +
        destStats.meanMs +
        compositeStats.meanMs) *
        100,
    ) / 100;
  console.log(
    `\nEstimated Full Deterministic Pipeline Mean: ~${totalMeanMs} ms (excluding network/storage)`,
  );
  console.log('='.repeat(78));
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
