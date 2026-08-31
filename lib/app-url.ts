/**
 * Centralized URL utility for constructing public Dvideo URLs.
 *
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL if explicitly configured (non-empty)
 * 2. Vercel deployment production/preview URLs (NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL, NEXT_PUBLIC_VERCEL_URL, VERCEL_URL)
 * 3. Client browser runtime window.location.origin (dynamically adapts to current host/port/IP on LAN)
 * 4. Fallback relative path
 */

export function getBaseUrl(): string {
  // 1. Explicitly configured public URL
  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, '');
  }

  // 2. Vercel deployment URLs
  const vercelProdUrl =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProdUrl) {
    const formatted = vercelProdUrl.startsWith('http') ? vercelProdUrl : `https://${vercelProdUrl}`;
    return formatted.replace(/\/+$/, '');
  }

  const vercelUrl =
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const formatted = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
    return formatted.replace(/\/+$/, '');
  }

  // 3. Client browser runtime (dynamically adapts to current domain or local network IP)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return '';
}

export function getDvideoUrl(token: string): string {
  const base = getBaseUrl();
  return base ? `${base}/t/${token}` : `/t/${token}`;
}

// Alias for backwards compatibility
export const getTraceLinkUrl = getDvideoUrl;
