import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/configs/db';
import { chatSessionsTable, chatHistoryTable } from '@/configs/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const sessionId = parseInt(id);

        if (isNaN(sessionId)) {
            return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
        }

        // Verify the session exists (security check)
        const session = await db
            .select()
            .from(chatSessionsTable)
            .where(eq(chatSessionsTable.id, sessionId))
            .limit(1);

        if (session.length === 0) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Get chat history for this session
        const history = await db
            .select()
            .from(chatHistoryTable)
            .where(eq(chatHistoryTable.sessionId, sessionId))
            .orderBy(asc(chatHistoryTable.createdAt));

        // Transform the history to match our ChatMessage interface
        const transformedHistory = history.flatMap(entry => [
            {
                role: 'user' as const,
                content: entry.question,
                timestamp: entry.createdAt?.toISOString() || new Date().toISOString(),
            },
            {
                role: 'assistant' as const,
                content: entry.answer,
                timestamp: entry.createdAt?.toISOString() || new Date().toISOString(),
            }
        ]);

        return NextResponse.json(transformedHistory);

    } catch (error) {
        console.error('Error fetching chat history:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
