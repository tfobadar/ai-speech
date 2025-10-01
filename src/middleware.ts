import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Temporary middleware bypass for Clerk issues
export function middleware(request: NextRequest) {
    console.log('[MIDDLEWARE] Route accessed:', request.url);

    // Just pass through all requests without Clerk authentication
    return NextResponse.next();
}

// Define the matcher for routes
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ]
};