declare const __API_BASE__: string;

/** Prefix every /api call with the backend origin in production. */
export function apiUrl(path: string): string {
  return `${__API_BASE__}${path}`;
}
