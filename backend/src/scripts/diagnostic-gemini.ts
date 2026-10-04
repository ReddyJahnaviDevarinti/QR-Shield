import { performance } from 'node:perf_hooks';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { generateExplanation } from '../integrations/gemini/index.js';
import type { ExplanationInput } from '../integrations/gemini/types.js';

// Load .env
const candidatePaths = ['.env', 'backend/.env', '../backend/.env'];
for (const p of candidatePaths) {
  if (existsSync(p)) {
    process.loadEnvFile?.(resolve(p));
    break;
  }
}

const apiKey = process.env['GEMINI_API_KEY']?.trim();

if (!apiKey || apiKey === 'REPLACE_ME') {
  console.error(
    JSON.stringify({
      status: 'FAILED',
      reason: 'GEMINI_API_KEY missing or placeholder in .env',
    }),
  );
  process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

const syntheticEvidence: ExplanationInput = {
  canonicalStatus: 'VERIFIED',
  scannedDestination: 'qrshield-test@icici',
  matchedDestination: 'qrshield-test@icici',
  destinationMatch: true,
  riskFactors: [],
  recommendation: 'REVIEW_NOT_REQUIRED',
  imageQualitySummary: {
    overallQuality: 'ACCEPTABLE',
    brightnessClassification: 'ACCEPTABLE',
    contrastClassification: 'ACCEPTABLE_CONTRAST',
    sharpnessClassification: 'ACCEPTABLE_SHARPNESS',
  },
  tamperSummary: null,
  evidenceCodes: ['VERIFIED', 'EXACT_MATCH'],
};

async function run() {
  const startTime = performance.now();
  try {
    const result = await generateExplanation(syntheticEvidence, { client });
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    console.log(
      JSON.stringify(
        {
          success: true,
          provider: result.metadata.provider,
          model: result.metadata.model,
          duration_ms: durationMs,
          explanation: result.explanation,
          structured: result.structured ?? null,
        },
        null,
        2,
      ),
    );
  } catch (err: unknown) {
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
    console.error(
      JSON.stringify(
        {
          success: false,
          duration_ms: durationMs,
          error: err instanceof Error ? err.message : String(err),
        },
        null,
        2,
      ),
    );
  }
}

run();
