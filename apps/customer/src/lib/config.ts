/**
 * Customer Application Centralized Configuration
 * Complies with PrintStation Vercel Deployment Specification (Rules 1, 8, 16):
 * - Centralizes all API endpoints and environmental parameters
 * - Prevents hardcoded localhost or LAN IPs in production builds
 */

function resolveApiBaseUrl(): string {
  // 1. Primary: Standard production / cloud API URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // 2. Secondary: Existing local station URL
  if (process.env.NEXT_PUBLIC_PRINT_STATION_URL) {
    return process.env.NEXT_PUBLIC_PRINT_STATION_URL.replace(/\/+$/, '');
  }

  // 3. Fallback for client-side local testing only
  if (typeof window !== 'undefined' && window.location) {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
      return `http://${hostname}:3000`;
    }
  }

  return '';
}

export const config = {
  get apiUrl(): string {
    return resolveApiBaseUrl();
  },
  defaultStationId: process.env.NEXT_PUBLIC_DEFAULT_STATION_ID || 'PS-TEST-001',
};
