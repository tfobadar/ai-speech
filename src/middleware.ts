import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
    '/dashboard(.*)',
    '/text-to-speech(.*)',
    '/api/chat(.*)',
    '/api/documents(.*)',
    '/api/generate(.*)',
    '/api/process(.*)',
    '/api/summarize(.*)',
]);

const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    console.log('[MIDDLEWARE] Route accessed:', req.url);

    // Allow public routes without authentication
    if (isPublicRoute(req)) {
        console.log('[MIDDLEWARE] Public route, allowing access');
        return;
    }

    // For protected routes, check authentication but don't force redirect
    // Let the client-side handle the authentication state
    if (isProtectedRoute(req)) {
        console.log('[MIDDLEWARE] Protected route, checking auth...');
        try {
            // Just check auth state without forcing redirect
            const authResult = await auth();
            console.log('[MIDDLEWARE] Auth result:', authResult?.userId ? 'authenticated' : 'not authenticated');
        } catch (error) {
            console.log('[MIDDLEWARE] Auth check error:', error);
        }
    }
});

export const config = {
    matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};