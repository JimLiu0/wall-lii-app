import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const validRegions = ['na', 'eu', 'ap', 'cn', 'all'];

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Skip processing for /lb/[region] URLs
  if (pathname.startsWith('/lb/')) {
    return NextResponse.next();
  }

  // Handle root-level region URLs (e.g., /na -> /lb/na)
  if (validRegions.includes(pathname.slice(1).toLowerCase())) {
    const url = request.nextUrl.clone();
    url.pathname = `/lb${pathname}`;
    return NextResponse.redirect(url);
  }

  // Handle URLs like /player/d/0 or /player/w/0 (without region)
  const shortFormatRegex = /^\/([^\/]+)\/(d|day|w|week)\/(\d+)$/;
  const shortMatch = pathname.match(shortFormatRegex);

  if (shortMatch) {
    const [, player, view, offset] = shortMatch;
    
    // Skip if the player is a valid region
    if (validRegions.includes(player.toLowerCase())) {
      return NextResponse.next();
    }
    
    // Normalize view parameter (d/day -> d, w/week -> w)
    const normalizedView = view.startsWith('d') ? 'd' : 'w';
    
    // Create the new URL with query parameters
    const url = request.nextUrl.clone();
    url.pathname = `/${player}`;
    
    // Preserve existing search params and add view and offset
    const params = new URLSearchParams(searchParams);
    params.set('v', normalizedView);
    params.set('o', offset);
    url.search = params.toString();
    
    return NextResponse.redirect(url);
  }

  // Handle old format URLs like /region/player/d/0 or /region/player/w/0
  const oldFormatRegex = /^\/([^\/]+)\/([^\/]+)\/(d|day|w|week)\/(\d+)$/;
  const oldMatch = pathname.match(oldFormatRegex);

  if (oldMatch) {
    const [, region, player, view, offset] = oldMatch;
    
    // Skip if the first segment is 'lb'
    if (region === 'lb') {
      return NextResponse.next();
    }
    
    // Normalize view parameter (d/day -> d, w/week -> w)
    const normalizedView = view.startsWith('d') ? 'd' : 'w';
    
    // Create the new URL with query parameters
    const url = request.nextUrl.clone();
    url.pathname = `/${player}`;
    url.search = `?r=${region}&v=${normalizedView}&o=${offset}`;
    
    return NextResponse.redirect(url);
  }

  // Handle old format URLs like /region/player
  const oldPlayerRegex = /^\/([^\/]+)\/([^\/]+)$/;
  const oldPlayerMatch = pathname.match(oldPlayerRegex);

  if (oldPlayerMatch) {
    const [, region, player] = oldPlayerMatch;
    
    // Skip if the first segment is 'lb'
    if (region === 'lb') {
      return NextResponse.next();
    }
    
    // Create the new URL with query parameters
    const url = request.nextUrl.clone();
    url.pathname = `/${player}`;

    // Preserve existing search params and add region
    const params = new URLSearchParams(searchParams);
    params.set('r', region);
    url.search = params.toString();
    
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure matcher to only run middleware on specific paths
export const config = {
  matcher: [
    // Match root path
    '/',
    // Match root-level region paths
    '/na',
    '/eu',
    '/ap',
    '/cn',
    '/all',
    // Match paths without region
    '/:player/d/:offset',
    '/:player/day/:offset',
    '/:player/w/:offset',
    '/:player/week/:offset',
    // Match old format paths that need redirection
    '/:region/:player/d/:offset',
    '/:region/:player/day/:offset',
    '/:region/:player/w/:offset',
    '/:region/:player/week/:offset',
    '/:region/:player',
    // Exclude /lb/[region] paths
    '/((?!lb/).*)',
  ],
}; 