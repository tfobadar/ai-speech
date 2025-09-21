import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes (routes that don't require authentication)
const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/'
]);

export default clerkMiddleware(async (auth, req) => {
    // Protect all routes except public ones
    if (!isPublicRoute(req)) {
        await auth.protect();
    }
});

// Define the matcher for routes
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api routes for webhooks
         */
        "/((?!_next/static|_next/image|favicon.ico|api).*)",
    ]
};