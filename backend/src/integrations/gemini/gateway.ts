import { GoogleGenAI, Type } from '@google/genai';
import { getGeminiClient } from './client.js';
import { getDeterministicFallbackExplanation } from './fallback.js';
import { GEMINI_SYSTEM_INSTRUCTION, buildExplanationPrompt } from './prompt.js';
import { env } from '../../config/env.js';
import type {
  ExplanationInput,
  ExplanationResult,
  GeminiStructuredOutput,
} from './types.js';

export const GEMINI_MODEL = 'gemini-3.8-flash';
export const DEFAULT_TIMEOUT_MS = 2000;
export const CIRCUIT_BREAKER_COOLDOWN_MS = 30000;

let circuitBreakerOpenUntil = 0;

export function isGeminiCircuitOpen(): boolean {
  return Date.now() < circuitBreakerOpenUntil;
}

export function resetGeminiCircuitBreaker(): void {
  circuitBreakerOpenUntil = 0;
}

export interface GenerateExplanationOptions {
  client?: GoogleGenAI | null;
  timeoutMs?: number;
}

/**
 * Sanitizes plain text from the model to prevent HTML/script injection or unsafe markup.
 */
function sanitizeText(raw: string): string {
  if (typeof raw !== 'string') return '';
  return (
    raw
      .replace(/<[^>]*>/g, '') // Strip HTML/XML tags
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Strip control characters
      .trim()
  );
}

/**
 * Validates that the generated text adheres to safety boundaries and does not contradict
 * the authoritative canonical status or solicit sensitive credentials.
 */
function isExplanationSafeAndConsistent(
  output: GeminiStructuredOutput,
  canonicalStatus: string,
): boolean {
  const combinedText =
    `${output.summary} ${output.action} ${output.key_findings.join(' ')}`.toLowerCase();

  // 1. Prohibit credential solicitation
  if (/\b(pin|otp|password|cvv|card\s*number)\b/i.test(combinedText)) {
    return false;
  }

  // 2. Prohibit false safety guarantees or unverified fraud accusations
  if (
    /\b(guaranteed\s+safe|100%\s+safe|definitely\s+fake|definitely\s+fraud|confirmed\s+scam|confirmed\s+fraud)\b/i.test(
      combinedText,
    )
  ) {
    return false;
  }

  // 3. Prevent contradiction of the canonical status
  if (canonicalStatus === 'VERIFIED') {
    if (
      /\b(mismatch|conflicts\s+with|unverified|suspicious|tamper|invalid\s+destination)\b/i.test(
        combinedText,
      )
    ) {
      return false;
    }
  } else if (canonicalStatus === 'DESTINATION_MISMATCH') {
    if (
      /\b(destination\s+matches|matches\s+the\s+registered|successfully\s+verified|active\s+trusted\s+match)\b/i.test(
        combinedText,
      )
    ) {
      return false;
    }
  } else if (canonicalStatus === 'UNVERIFIED') {
    if (
      /\b(matches\s+the\s+registered|destination\s+matches|successfully\s+verified)\b/i.test(
        combinedText,
      )
    ) {
      return false;
    }
  } else if (canonicalStatus === 'INSUFFICIENT_EVIDENCE') {
    if (
      /\b(destination\s+matches|successfully\s+verified|active\s+trusted\s+match)\b/i.test(
        combinedText,
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Parses and validates raw model text into a validated GeminiStructuredOutput.
 */
function parseAndValidateModelOutput(rawText: string): GeminiStructuredOutput | null {
  try {
    const parsed = JSON.parse(rawText) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const rec = parsed as Record<string, unknown>;

    // summary must be a non-empty string
    if (typeof rec['summary'] !== 'string' || rec['summary'].trim().length === 0) {
      return null;
    }

    // key_findings must be an array of strings
    if (
      !Array.isArray(rec['key_findings']) ||
      !rec['key_findings'].every((item) => typeof item === 'string')
    ) {
      return null;
    }

    // action must be a non-empty string
    if (typeof rec['action'] !== 'string' || rec['action'].trim().length === 0) {
      return null;
    }

    // Reject if output attempts to hijack canonical status
    if ('status' in rec || 'verification_status' in rec) {
      // The status field is forbidden in model output to prevent authority confusion
      return null;
    }

    return {
      summary: sanitizeText(rec['summary']),
      key_findings: (rec['key_findings'] as string[]).map(sanitizeText).filter(Boolean),
      action: sanitizeText(rec['action']),
    };
  } catch {
    return null;
  }
}

/**
 * Executes a Gemini explanation request with a strict timeout and automatic deterministic fallback.
 *
 * ARCHITECTURAL INVARIANT:
 * This gateway NEVER decides or alters canonical verification status.
 * The deterministic status passed in input.canonicalStatus is authoritative.
 */
export async function generateExplanation(
  input: ExplanationInput,
  options?: GenerateExplanationOptions,
): Promise<ExplanationResult> {
  const fallbackExplanation = getDeterministicFallbackExplanation(input.canonicalStatus);

  const fallbackResult: ExplanationResult = {
    explanation: fallbackExplanation,
    metadata: {
      provider: 'deterministic_fallback',
      model: null,
    },
  };

  // If circuit breaker is open (e.g. recent 429 quota exhaustion or 503), return fallback immediately
  if (isGeminiCircuitOpen()) {
    return fallbackResult;
  }

  const client = options?.client !== undefined ? options.client : getGeminiClient();
  if (!client) {
    return fallbackResult;
  }

  const timeoutMs = options?.timeoutMs ?? env.GEMINI_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS;
  const prompt = buildExplanationPrompt(input);

  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        try {
          controller.abort();
        } catch {
          // ignore abort failures
        }
        reject(new Error(`Gemini request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const apiCallPromise = client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'Short neutral explanation of the verification result.',
            },
            key_findings: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: 'Factual key findings based only on the provided evidence.',
            },
            action: {
              type: Type.STRING,
              description: 'Neutral recommended user action.',
            },
          },
          required: ['summary', 'key_findings', 'action'],
        },
        maxOutputTokens: 200,
        temperature: 0.1,
        abortSignal: controller.signal,
      },
    });

    const response = await Promise.race([apiCallPromise, timeoutPromise]);
    if (timer) clearTimeout(timer);

    const rawText = response.text?.trim();
    if (!rawText) {
      return fallbackResult;
    }

    const structured = parseAndValidateModelOutput(rawText);
    if (!structured) {
      return fallbackResult;
    }

    if (!isExplanationSafeAndConsistent(structured, input.canonicalStatus)) {
      return fallbackResult;
    }

    return {
      explanation: structured.summary,
      structured: {
        summary: structured.summary,
        keyFindings: structured.key_findings,
        action: structured.action,
      },
      metadata: {
        provider: 'gemini',
        model: GEMINI_MODEL,
      },
    };
  } catch (err: unknown) {
    if (timer) clearTimeout(timer);
    try {
      controller.abort();
    } catch {
      // ignore
    }

    // Check for rate-limiting, quota exhaustion, or service unavailability to trip circuit breaker
    const errStr = String(err).toLowerCase();
    const errStatus = (err as { status?: number })?.status;
    if (
      errStatus === 429 ||
      errStatus === 503 ||
      errStr.includes('resource_exhausted') ||
      errStr.includes('quota') ||
      errStr.includes('503') ||
      errStr.includes('unavailable')
    ) {
      circuitBreakerOpenUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
    }

    return fallbackResult;
  }
}
