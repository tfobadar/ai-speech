import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        console.log('[DEBUG-ENV] Environment check');

        const envVars = {
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY ? 'SET' : 'NOT SET',
            GOOGLE_PROJECT_NUMBER: process.env.GOOGLE_PROJECT_NUMBER ? 'SET' : 'NOT SET',
            CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? 'SET' : 'NOT SET',
            DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
            NEXT_PUBLIC_DATABASE_URL: process.env.NEXT_PUBLIC_DATABASE_URL ? 'SET' : 'NOT SET',
        };

        // Test Google AI initialization
        let googleAIStatus: string;
        try {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const apiKey = process.env.GOOGLE_AI_API_KEY || 'HARDCODED_KEY_SET';
            const genAI = new GoogleGenerativeAI(apiKey);
            genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash-exp' });
            googleAIStatus = 'CLIENT_INITIALIZED';
        } catch (error) {
            googleAIStatus = `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

        return NextResponse.json({
            environment: 'production',
            timestamp: new Date().toISOString(),
            envVars,
            googleAIStatus,
            nodeVersion: process.version,
        });

    } catch (error) {
        console.error('[DEBUG-ENV] Error:', error);
        return NextResponse.json(
            { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
