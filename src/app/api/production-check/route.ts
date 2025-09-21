import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        // Check if basic environment variables are available
        const envStatus = {
            hasClerkSecret: !!process.env.CLERK_SECRET_KEY,
            hasClerkPublishable: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            hasPublicDatabaseUrl: !!process.env.NEXT_PUBLIC_DATABASE_URL,
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV,
            timestamp: new Date().toISOString()
        };

        console.log('Environment check:', envStatus);

        // Simple database connection test
        let dbConnection = 'unknown';
        try {
            const { neon } = await import('@neondatabase/serverless');
            const databaseUrl = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_DATABASE_URL;

            if (databaseUrl) {
                const sql = neon(databaseUrl);
                await sql`SELECT 1 as test`;
                dbConnection = 'success';
            } else {
                dbConnection = 'no_url';
            }
        } catch (dbError) {
            console.error('Database test error:', dbError);
            dbConnection = 'failed';
        }

        return NextResponse.json({
            success: true,
            environment: envStatus,
            databaseConnection: dbConnection,
            message: 'Production diagnostic completed'
        });

    } catch (error) {
        console.error('Diagnostic error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
