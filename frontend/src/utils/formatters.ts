/**
 * Formats a raw ISO timestamp into a localized readable date/time string.
 */
export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return isoString;
    }
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

/**
 * Normalizes payment destination strings (lowercases and trims).
 */
export function normalizeDestination(raw: string): string {
  return raw.trim().toLowerCase();
}
