// Temporary environment overrides for production deployment
// This ensures all required environment variables are available

if (typeof window === 'undefined') { // Server-side only
    // Set environment variables if not already set
    if (!process.env.CLERK_SECRET_KEY) {
        process.env.CLERK_SECRET_KEY = 'sk_test_8a5W67FymV6j8o2Lw9iz05Lr5hxFrBk1z3ZQGCJJr7';
    }

    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_Zmlyc3QtZ29waGVyLTMyLmNsZXJrLmFjY291bnRzLmRldiQ';
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
        process.env.GOOGLE_AI_API_KEY = 'AIzaSyBeMry95mVOeqIWexQQbxkTq9fTl3ph5Q0';
    }

    if (!process.env.GOOGLE_PROJECT_NUMBER) {
        process.env.GOOGLE_PROJECT_NUMBER = '892045469913';
    }

    if (!process.env.DATABASE_URL && !process.env.NEXT_PUBLIC_DATABASE_URL) {
        process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_3B1tvYQplkIy@ep-mute-salad-ab93deyl-pooler.eu-west-2.aws.neon.tech/text-speech-ai?sslmode=require';
    }

    console.log('[ENV-OVERRIDE] Environment variables set for production');
}
