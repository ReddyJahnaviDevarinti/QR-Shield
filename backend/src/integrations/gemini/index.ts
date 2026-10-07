export { getGeminiClient, resetGeminiClient } from './client.js';
export {
  generateExplanation,
  GEMINI_MODEL,
  DEFAULT_TIMEOUT_MS,
  CIRCUIT_BREAKER_COOLDOWN_MS,
  isGeminiCircuitOpen,
  resetGeminiCircuitBreaker,
  type GenerateExplanationOptions,
} from './gateway.js';
export {
  DETERMINISTIC_FALLBACKS,
  getDeterministicFallbackExplanation,
} from './fallback.js';
export { GEMINI_SYSTEM_INSTRUCTION, buildExplanationPrompt } from './prompt.js';
export {
  GeminiExplanationError,
  GeminiTimeoutError,
  GeminiMalformedOutputError,
  GeminiNotConfiguredError,
} from './errors.js';
export type {
  ExplanationInput,
  GeminiStructuredOutput,
  ExplanationProvider,
  ExplanationMetadata,
  ExplanationResult,
} from './types.js';
