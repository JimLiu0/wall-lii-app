import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Match URLs like /region/player/d/0 or /region/player/w/0
  const statsPathRegex = /^\/([^\/]+)\/([^\/]+)\/(d|day|w|week)\/(\d+)$/;
  const match = pathname.match(statsPathRegex);

  if (match) {
    const [, region, player, view, offset] = match;
    
    // Normalize view parameter (d/day -> d, w/week -> w)
    const normalizedView = view.startsWith('d') ? 'd' : 'w';
    
    // Create the new URL with query parameters
    const url = request.nextUrl.clone();
    url.pathname = `/${region}/${player}`;
    url.search = `?v=${normalizedView}&o=${offset}`;
    
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure matcher to only run middleware on specific paths
export const config = {
  matcher: [
    // Match paths that might need redirection
    '/:region/:player/d/:offset',
    '/:region/:player/day/:offset',
    '/:region/:player/w/:offset',
    '/:region/:player/week/:offset',
  ],
}; 