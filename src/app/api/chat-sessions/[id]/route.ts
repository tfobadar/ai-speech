import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { TTSDataService } from '@/lib/tts-data-service';

// DELETE /api/chat-sessions/[id] - Delete chat session
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sessionId = parseInt(params.id);
        if (isNaN(sessionId)) {
            return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
        }

        const result = await TTSDataService.deleteChatSession(sessionId, userId);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error deleting chat session:', error);
        return NextResponse.json({ error: 'Failed to delete chat session' }, { status: 500 });
    }
}

// GET /api/chat-sessions/[id]/history - Get chat history for session
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sessionId = parseInt(params.id);
        if (isNaN(sessionId)) {
            return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
        }

        const history = await TTSDataService.getChatHistory(sessionId);
        return NextResponse.json({ history });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
    }
}
