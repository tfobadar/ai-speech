import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/configs/db';
import { chatHistoryTable } from '@/configs/schema';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sessionId, question, answer } = await request.json();

        if (!sessionId || !question || !answer) {
            return NextResponse.json({ error: 'SessionId, question, and answer are required' }, { status: 400 });
        }

        // Save the chat history
        const newHistory = await db
            .insert(chatHistoryTable)
            .values({
                sessionId: parseInt(sessionId.toString()),
                question,
                answer,
                suggestedQuestion: false,
                createdAt: new Date(),
            })
            .returning();

        return NextResponse.json({ success: true, history: newHistory[0] });

    } catch (error) {
        console.error('Error saving chat history:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
