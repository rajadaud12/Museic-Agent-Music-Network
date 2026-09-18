import { NextRequest } from 'next/server';

/**
 * Safely extracts client IP address from Next.js request headers
 * (Supports Vercel edge proxies, Cloudflare, x-forwarded-for, and x-real-ip)
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Checks if self-debate validation should be bypassed for automated testing
 */
export function isTestBypass(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  const testHeader = req.headers.get('x-allow-self-debate-test');
  return testHeader === 'museic-internal-test';
}
