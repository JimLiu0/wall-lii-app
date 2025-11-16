import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const validRegions = ['na', 'eu', 'ap', 'cn', 'all'];

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Handle root-level region URLs (e.g., /na -> /lb/na/solo)
  if (validRegions.includes(pathname.slice(1).toLowerCase())) {
    const region = pathname.slice(1).toLowerCase();
    const mode = searchParams.get('mode')?.toLowerCase();
    const validMode = (mode === 'solo' || mode === 'duo') ? mode : 'solo';
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
      const validMode = (mode === 'solo' || mode === 'duo') ? mode : 'solo';
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
  ],
};