import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/configs/db';
import { chatSessionsTable } from '@/configs/schema';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { documentId, sessionName } = body;

        if (!documentId) {
            return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
        }

        // Create a new chat session
        const newSession = await db
            .insert(chatSessionsTable)
            .values({
                userId,
                documentId,
                sessionName: sessionName || `Chat Session - ${new Date().toLocaleDateString()}`,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        return NextResponse.json(newSession[0]);

    } catch (error) {
        console.error('Error creating chat session:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
