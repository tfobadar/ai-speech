import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/configs/db';
import { documentsTable, chatSessionsTable } from '@/configs/schema';
import { eq, and, desc } from 'drizzle-orm';

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
        const documentId = parseInt(id);

        if (isNaN(documentId)) {
            return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
        }

        // Verify the document belongs to the user
        const document = await db
            .select()
            .from(documentsTable)
            .where(and(
                eq(documentsTable.id, documentId),
                eq(documentsTable.userId, userId)
            ))
            .limit(1);

        if (document.length === 0) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Get chat sessions for this document
        const sessions = await db
            .select()
            .from(chatSessionsTable)
            .where(eq(chatSessionsTable.documentId, documentId))
            .orderBy(desc(chatSessionsTable.createdAt));

        return NextResponse.json(sessions);

    } catch (error) {
        console.error('Error fetching chat sessions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
