import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const validRegions = ['na', 'eu', 'ap', 'cn', 'all'];

const blockedIPs = new Set([
  '98.92.59.8',
]);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'wallii_middleware_rl',
});

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown';
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const ip = getClientIP(request);

  const shouldProtect = pathname.startsWith('/stats/');

  if (shouldProtect) {
    if (blockedIPs.has(ip)) {
      return new NextResponse('Blocked', { status: 403 });
    }

    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
      return new NextResponse('Too many requests', {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
        },
      });
    }
  }

  // Handle root-level region URLs (e.g., /na -> /lb/na/solo)
  if (validRegions.includes(pathname.slice(1).toLowerCase())) {
    const region = pathname.slice(1).toLowerCase();
    const mode = searchParams.get('mode')?.toLowerCase();
    const validMode = mode === 'solo' || mode === 'duo' ? mode : 'solo';
    const url = request.nextUrl.clone();
    url.pathname = `/lb/${region}/${validMode}`;
    url.search = ''; // Remove query params
    return NextResponse.redirect(url);
  }

  // Handle /lb/[region] URLs (with or without query params)
  const lbRegionMatch = pathname.match(/^\/lb\/([^/]+)$/);
  if (lbRegionMatch) {
    const region = lbRegionMatch[1].toLowerCase();
    if (validRegions.includes(region)) {
      const mode = searchParams.get('mode')?.toLowerCase();
      const validMode = mode === 'solo' || mode === 'duo' ? mode : 'solo';
      const url = request.nextUrl.clone();
      url.pathname = `/lb/${region}/${validMode}`;
      url.search = ''; // Remove query params
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Configure matcher to only run middleware on specific paths
export const config = {
  matcher: [
    '/',
    '/na',
    '/eu',
    '/ap',
    '/cn',
    '/all',
    '/lb/:path*',
    '/stats/:path*',
  ],
};