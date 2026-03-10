import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { get } from '@vercel/edge-config';

const validRegions = ['na', 'eu', 'ap', 'cn', 'all'];

const blockedIPs = new Set(['98.92.59.8']);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: false,
  prefix: 'wallii_middleware_rl',
});

const AUTO_BLOCK_THRESHOLD = 3;
const AUTO_BLOCK_WINDOW_SECONDS = 60 * 10;
const AUTO_BLOCK_DURATION_SECONDS = 60 * 60 * 24;

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

function getAutoBlockKey(ip: string): string {
  return `autoblock:ip:${ip}`;
}

function getStrikeKey(ip: string): string {
  return `autoblock:strikes:${ip}`;
}

async function isEdgeConfigBlocked(ip: string): Promise<boolean> {
  try {
    const edgeBlockedIPs = await get<string[]>('blocked_ips');
    return Array.isArray(edgeBlockedIPs) && edgeBlockedIPs.includes(ip);
  } catch (error) {
    console.error('Failed to read blocked_ips from Edge Config', error);
    return false;
  }
}

async function isAutoBlocked(ip: string): Promise<boolean> {
  try {
    const blocked = await redis.get<string>(getAutoBlockKey(ip));
    return blocked === '1';
  } catch (error) {
    console.error('Failed to read autoblock state', error);
    return false;
  }
}

async function registerRateLimitViolation(ip: string): Promise<void> {
  try {
    const strikeKey = getStrikeKey(ip);
    const strikes = await redis.incr(strikeKey);

    if (strikes === 1) {
      await redis.expire(strikeKey, AUTO_BLOCK_WINDOW_SECONDS);
    }

    if (strikes >= AUTO_BLOCK_THRESHOLD) {
      const blockKey = getAutoBlockKey(ip);
      await redis.set(blockKey, '1', { ex: AUTO_BLOCK_DURATION_SECONDS });
      console.warn(`Auto-blocked IP ${ip} for repeated rate-limit violations`);
    }
  } catch (error) {
    console.error('Failed to register rate-limit violation', error);
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const ip = getClientIP(request);

  const shouldProtect = pathname.startsWith('/stats/');

  if (shouldProtect) {
    if (blockedIPs.has(ip)) {
      return new NextResponse('Blocked', { status: 403 });
    }

    if (await isEdgeConfigBlocked(ip)) {
      return new NextResponse('Blocked', { status: 403 });
    }

    if (await isAutoBlocked(ip)) {
      return new NextResponse('Blocked', { status: 403 });
    }

    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
      await registerRateLimitViolation(ip);

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
    url.search = '';
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
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/na', '/eu', '/ap', '/cn', '/all', '/lb/:path*', '/stats/:path*'],
};