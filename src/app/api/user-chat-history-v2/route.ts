import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
    try {
        console.log('[USER-CHAT-HISTORY] Starting request');

        // Get user authentication
        const { userId } = await auth();
        console.log('[USER-CHAT-HISTORY] User ID:', userId);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Test database connection first
        try {
            const { db } = await import('@/configs/db');
            const { documentsTable, chatSessionsTable, chatHistoryTable } = await import('@/configs/schema');
            const { eq, desc } = await import('drizzle-orm');

            console.log('[USER-CHAT-HISTORY] Database modules loaded');

            // Simple test query to check connection
            const testQuery = await db.select().from(documentsTable).limit(1);
            console.log('[USER-CHAT-HISTORY] Database connection test passed');

            // Get user's documents count to verify user access
            const userDocs = await db
                .select()
                .from(documentsTable)
                .where(eq(documentsTable.userId, userId))
                .limit(10);

            console.log('[USER-CHAT-HISTORY] Found', userDocs.length, 'documents for user');

            if (userDocs.length === 0) {
                return NextResponse.json({
                    success: true,
                    data: [],
                    message: 'No documents found for this user',
                    totalDocuments: 0,
                    totalSessions: 0,
                    totalQuestions: 0
                });
            }

            // Get chat history with detailed joins
            const chatHistoryWithDetails = await db
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

            console.log('[USER-CHAT-HISTORY] Found', chatHistoryWithDetails.length, 'chat entries');

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

            // Convert to array format
            const result = Object.values(groupedHistory).map((doc: any) => ({
                ...doc,
                sessions: Object.values(doc.sessions).sort((a: any, b: any) =>
                    new Date(b.sessionCreatedAt).getTime() - new Date(a.sessionCreatedAt).getTime()
                )
            }));

            console.log('[USER-CHAT-HISTORY] Returning', result.length, 'documents with history');

            return NextResponse.json({
                success: true,
                data: result,
                totalDocuments: result.length,
                totalSessions: result.reduce((sum: number, doc: any) => sum + doc.sessions.length, 0),
                totalQuestions: chatHistoryWithDetails.length
            });

        } catch (dbError) {
            console.error('[USER-CHAT-HISTORY] Database error:', dbError);
            return NextResponse.json({
                error: 'Database connection failed',
                details: process.env.NODE_ENV === 'development' ? (dbError instanceof Error ? dbError.message : String(dbError)) : 'Database unavailable'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('[USER-CHAT-HISTORY] Unexpected error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : 'Server error'
        }, { status: 500 });
    }
}
