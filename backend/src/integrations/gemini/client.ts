import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';

let cachedClient: GoogleGenAI | null = null;

/**
 * Returns a server-only GoogleGenAI client initialized with GEMINI_API_KEY from the environment.
 * If GEMINI_API_KEY is not configured, returns null without throwing.
 *
 * SECURITY:
 * Never log, print, or expose the API key or the client instance to the frontend.
 */
export function getGeminiClient(): GoogleGenAI | null {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'REPLACE_ME') {
    return null;
  }

  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

/**
 * Resets the cached Gemini client instance (primarily for testing).
 */
export function resetGeminiClient(): void {
  cachedClient = null;
}
