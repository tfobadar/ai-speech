import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { TTSDataService } from '@/lib/tts-data-service';

// GET /api/documents - Get user's documents
export async function GET(request: NextRequest) {
    try {
        console.log('📋 Documents API: Starting request');

        const { userId } = await auth();
        console.log('📋 Documents API: User ID from auth:', userId);

        if (!userId) {
            console.log('📋 Documents API: No user ID - unauthorized');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('📋 Documents API: Parsing request params');
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search');

        console.log('📋 Documents API: Limit:', limit, 'Search:', search);

        let documents;
        try {
            if (search) {
                console.log('📋 Documents API: Searching documents...');
                documents = await TTSDataService.searchDocuments(userId, search, limit);
            } else {
                console.log('📋 Documents API: Getting user documents...');
                documents = await TTSDataService.getUserDocuments(userId, limit);
            }
            console.log('📋 Documents API: Found', documents?.length || 0, 'documents');
        } catch (dbError) {
            console.error('📋 Documents API: Database error:', dbError);
            return NextResponse.json({
                error: 'Database connection failed',
                details: process.env.NODE_ENV === 'development' ? (dbError instanceof Error ? dbError.message : String(dbError)) : 'Internal error'
            }, { status: 500 });
        }

        return NextResponse.json({ documents });
    } catch (error) {
        console.error('📋 Documents API: Unexpected error:', error);
        return NextResponse.json({
            error: 'Failed to fetch documents',
            details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : 'Internal error'
        }, { status: 500 });
    }
}
