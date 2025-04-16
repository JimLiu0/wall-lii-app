import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Handle URLs like /player/d/0 or /player/w/0 (without region)
  const shortFormatRegex = /^\/([^\/]+)\/(d|day|w|week)\/(\d+)$/;
  const shortMatch = pathname.match(shortFormatRegex);

  if (shortMatch) {
    const [, player, view, offset] = shortMatch;
    
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
  ],
}; 