import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const validRegions = ['na', 'eu', 'ap', 'cn', 'all'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle root-level region URLs (e.g., /na -> /lb/na)
  if (validRegions.includes(pathname.slice(1).toLowerCase())) {
    const url = request.nextUrl.clone();
    url.pathname = `/lb${pathname}`;
    return NextResponse.redirect(url);
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
  ],
};