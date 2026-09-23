/**
 * PrintStation Admin Operations Console — API Configuration
 * Supports both:
 * 1. Local Monolith Mode: Empty base URL, proxied via Vite dev or served by Express
 * 2. Vercel Standalone Mode: Configured via VITE_API_URL environment variable
 */

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
}
