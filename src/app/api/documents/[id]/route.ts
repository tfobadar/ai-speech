import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { TTSDataService } from '@/lib/tts-data-service';

// GET /api/documents/[id] - Get specific document with sessions
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const documentId = parseInt(id);
        if (isNaN(documentId)) {
            return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
        }

        const result = await TTSDataService.getDocumentWithSessions(documentId, userId);

        if (!result) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching document:', error);
        return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
    }
}

// DELETE /api/documents/[id] - Delete document
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const documentId = parseInt(id);
        if (isNaN(documentId)) {
            return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
        }

        const result = await TTSDataService.deleteDocument(documentId, userId);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
}
