import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/configs/db';
import { documentsTable, suggestedQuestionsTable } from '@/configs/schema';
import { eq, and } from 'drizzle-orm';

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

        // Get suggested questions for this document
        const questions = await db
            .select({
                question: suggestedQuestionsTable.question,
            })
            .from(suggestedQuestionsTable)
            .where(eq(suggestedQuestionsTable.documentId, documentId))
            .limit(10);

        // If no suggested questions exist, generate some based on the document content
        if (questions.length === 0) {
            // Generate suggested questions using AI (placeholder implementation)
            const suggestedQuestions = [
                "What is the main topic of this document?",
                "Can you summarize the key points?",
                "What are the important details I should know?",
                "How can I apply this information?",
                "What are the next steps mentioned?"
            ];

            // Optionally save these to the database for future use
            try {
                await db.insert(suggestedQuestionsTable).values(
                    suggestedQuestions.map(question => ({
                        documentId,
                        question,
                        createdAt: new Date(),
                    }))
                );
            } catch (insertError) {
                console.error('Error saving suggested questions:', insertError);
                // Continue even if saving fails
            }

            return NextResponse.json(suggestedQuestions);
        }

        return NextResponse.json(questions.map(q => q.question));

    } catch (error) {
        console.error('Error fetching suggested questions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
