import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/configs/db';
import { chatHistoryTable, chatSessionsTable, documentsTable } from '@/configs/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        console.log('💬 Chat History API: Starting request');

        const { userId } = await auth();
        console.log('� Chat History API: User ID from auth:', userId);

        if (!userId) {
            console.log('💬 Chat History API: No user ID - unauthorized');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check database connection first
        try {
            console.log('💬 Chat History API: Testing database connection...');

            // Debug: Check all user IDs in the system
            const allDocumentUsers = await db
                .select({ userId: documentsTable.userId })
                .from(documentsTable)
                .limit(10);

            console.log('💬 Chat History API: Database connected, found', allDocumentUsers.length, 'document users');

            const allSessionUsers = await db
                .select({ userId: chatSessionsTable.userId })
                .from(chatSessionsTable)
                .limit(10);

            console.log('� Chat History API: Found', allSessionUsers.length, 'session users');

            const uniqueDocUsers = [...new Set(allDocumentUsers.map(d => d.userId))];
            const uniqueSessionUsers = [...new Set(allSessionUsers.map(s => s.userId))];

            console.log('� Chat History API: Unique doc user IDs:', uniqueDocUsers);
            console.log('💬 Chat History API: Unique session user IDs:', uniqueSessionUsers);

        } catch (dbTestError) {
            console.error('💬 Chat History API: Database connection test failed:', dbTestError);
            return NextResponse.json({
                error: 'Database connection failed',
                details: process.env.NODE_ENV === 'development' ? 'Cannot connect to database' : 'Internal error'
            }, { status: 500 });
        }

        // Get all chat history for the user with session and document details
        console.log('� Chat History API: Fetching chat history for user:', userId); const chatHistoryWithDetails = await db
            .select({
                // Chat history fields
                id: chatHistoryTable.id,
                question: chatHistoryTable.question,
                answer: chatHistoryTable.answer,
                suggestedQuestion: chatHistoryTable.suggestedQuestion,
                createdAt: chatHistoryTable.createdAt,
                // Session fields
                sessionId: chatSessionsTable.id,
                sessionName: chatSessionsTable.sessionName,
                sessionCreatedAt: chatSessionsTable.createdAt,
                // Document fields
                documentId: documentsTable.id,
                documentTitle: documentsTable.title,
                documentType: documentsTable.documentType,
                fileName: documentsTable.fileName,
            })
            .from(chatHistoryTable)
            .innerJoin(chatSessionsTable, eq(chatHistoryTable.sessionId, chatSessionsTable.id))
            .innerJoin(documentsTable, eq(chatSessionsTable.documentId, documentsTable.id))
            .where(eq(documentsTable.userId, userId))
            .orderBy(desc(chatHistoryTable.createdAt));

        console.log('🔍 API: Raw query results:', chatHistoryWithDetails.length, 'entries');
        console.log('🔍 API: Sample result:', chatHistoryWithDetails[0]);

        // Group the results by document and session
        const groupedHistory = chatHistoryWithDetails.reduce((acc, item) => {
            const documentKey = `doc_${item.documentId}`;
            const sessionKey = `session_${item.sessionId}`;

            if (!acc[documentKey]) {
                acc[documentKey] = {
                    documentId: item.documentId,
                    documentTitle: item.documentTitle || 'Untitled Document',
                    documentType: item.documentType,
                    fileName: item.fileName,
                    sessions: {}
                };
            }

            if (!acc[documentKey].sessions[sessionKey]) {
                acc[documentKey].sessions[sessionKey] = {
                    sessionId: item.sessionId,
                    sessionName: item.sessionName,
                    sessionCreatedAt: item.sessionCreatedAt,
                    chatHistory: []
                };
            }

            acc[documentKey].sessions[sessionKey].chatHistory.push({
                id: item.id,
                question: item.question,
                answer: item.answer,
                suggestedQuestion: item.suggestedQuestion,
                createdAt: item.createdAt
            });

            return acc;
        }, {} as any);

        // Convert to array format for easier consumption
        const result = Object.values(groupedHistory).map((doc: any) => ({
            ...doc,
            sessions: Object.values(doc.sessions).sort((a: any, b: any) =>
                new Date(b.sessionCreatedAt).getTime() - new Date(a.sessionCreatedAt).getTime()
            )
        }));

        console.log('� Chat History API: Final result length:', result.length);
        console.log('� Chat History API: Sample result doc:', result[0]);

        return NextResponse.json({
            success: true,
            data: result,
            totalDocuments: result.length,
            totalSessions: result.reduce((sum: number, doc: any) => sum + doc.sessions.length, 0),
            totalQuestions: chatHistoryWithDetails.length
        });

    } catch (error) {
        console.error('💬 Chat History API: Unexpected error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal error'
            },
            { status: 500 }
        );
    }
}
