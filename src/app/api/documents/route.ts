import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { TTSDataService } from '@/lib/tts-data-service';

// GET /api/documents - Get user's documents
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search');

        let documents;
        if (search) {
            documents = await TTSDataService.searchDocuments(userId, search, limit);
        } else {
            documents = await TTSDataService.getUserDocuments(userId, limit);
        }

        return NextResponse.json({ documents });
    } catch (error) {
        console.error('Error fetching documents:', error);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}
