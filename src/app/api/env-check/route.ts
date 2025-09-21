import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const envCheck = {
            NODE_ENV: process.env.NODE_ENV,
            hasClerkSecret: !!process.env.CLERK_SECRET_KEY,
            hasClerkPublishable: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            hasPublicDatabaseUrl: !!process.env.NEXT_PUBLIC_DATABASE_URL,
            vercelEnv: process.env.VERCEL_ENV,
            timestamp: new Date().toISOString()
        };

        console.log('🔧 Environment Check:', envCheck);

        // Test database connection
        let dbStatus = 'unknown';
        try {
            const { db } = await import('@/configs/db');
            // Simple test query - this should not fail on a basic connection
            await db.execute('SELECT 1 as test');
            dbStatus = 'connected';
        } catch (dbError) {
            dbStatus = 'failed';
            console.error('🔧 Database test failed:', dbError);
        }

        return NextResponse.json({
            success: true,
            environment: envCheck,
            databaseStatus: dbStatus,
            message: 'Environment check completed'
        });

    } catch (error) {
        console.error('🔧 Environment check error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
