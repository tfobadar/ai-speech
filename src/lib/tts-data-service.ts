import { db } from '@/configs/db';
import { documentsTable, chatSessionsTable, chatHistoryTable, suggestedQuestionsTable } from '@/configs/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface DocumentData {
    userId: string;
    title?: string;
    content: string;
    summary?: string;
    documentType?: string;
    fileName?: string;
}

export interface ChatMessage {
    question: string;
    answer: string;
    suggestedQuestion?: boolean;
}

export class TTSDataService {
    // Save document to database
    static async saveDocument(data: DocumentData) {
        try {
            const [document] = await db.insert(documentsTable).values({
                userId: data.userId,
                title: data.title || `Document - ${new Date().toISOString().split('T')[0]}`,
                content: data.content,
                summary: data.summary,
                contentLength: data.content.length,
                documentType: data.documentType || 'text',
                fileName: data.fileName,
                createdAt: new Date(),
                updatedAt: new Date(),
            }).returning();

            return document;
        } catch (error) {
            console.error('Error saving document:', error);
            throw new Error('Failed to save document to database');
        }
    }

    // Update document (e.g., when summary is generated)
    static async updateDocument(documentId: number, updates: Partial<DocumentData & { summary: string }>) {
        try {
            const [document] = await db.update(documentsTable)
                .set({
                    ...updates,
                    updatedAt: new Date(),
                })
                .where(eq(documentsTable.id, documentId))
                .returning();

            return document;
        } catch (error) {
            console.error('Error updating document:', error);
            throw new Error('Failed to update document');
        }
    }

    // Create a new chat session
    static async createChatSession(userId: string, documentId: number, sessionName?: string) {
        try {
            const [session] = await db.insert(chatSessionsTable).values({
                userId,
                documentId,
                sessionName: sessionName || `Chat - ${new Date().toLocaleTimeString()}`,
                createdAt: new Date(),
                updatedAt: new Date(),
            }).returning();

            return session;
        } catch (error) {
            console.error('Error creating chat session:', error);
            throw new Error('Failed to create chat session');
        }
    }

    // Save chat message (question and answer)
    static async saveChatMessage(sessionId: number, message: ChatMessage) {
        try {
            const [chatRecord] = await db.insert(chatHistoryTable).values({
                sessionId,
                question: message.question,
                answer: message.answer,
                suggestedQuestion: message.suggestedQuestion || false,
                createdAt: new Date(),
            }).returning();

            return chatRecord;
        } catch (error) {
            console.error('Error saving chat message:', error);
            throw new Error('Failed to save chat message');
        }
    }

    // Save suggested questions for a document
    static async saveSuggestedQuestions(documentId: number, questions: string[]) {
        try {
            // First, delete any existing suggested questions for this document
            await db.delete(suggestedQuestionsTable).where(eq(suggestedQuestionsTable.documentId, documentId));

            // Insert new suggested questions
            if (questions.length > 0) {
                const questionData = questions.map((question, index) => ({
                    documentId,
                    question,
                    questionOrder: index + 1,
                    createdAt: new Date(),
                }));

                const savedQuestions = await db.insert(suggestedQuestionsTable).values(questionData).returning();
                return savedQuestions;
            }

            return [];
        } catch (error) {
            console.error('Error saving suggested questions:', error);
            throw new Error('Failed to save suggested questions');
        }
    }

    // Get user's documents
    static async getUserDocuments(userId: string, limit: number = 10) {
        try {
            const documents = await db.select()
                .from(documentsTable)
                .where(eq(documentsTable.userId, userId))
                .orderBy(desc(documentsTable.createdAt))
                .limit(limit);

            return documents;
        } catch (error) {
            console.error('Error fetching user documents:', error);
            throw new Error('Failed to fetch user documents');
        }
    }

    // Get document with its chat sessions
    static async getDocumentWithSessions(documentId: number, userId: string) {
        try {
            const document = await db.select()
                .from(documentsTable)
                .where(and(
                    eq(documentsTable.id, documentId),
                    eq(documentsTable.userId, userId)
                ))
                .limit(1);

            if (document.length === 0) {
                return null;
            }

            const sessions = await db.select()
                .from(chatSessionsTable)
                .where(eq(chatSessionsTable.documentId, documentId))
                .orderBy(desc(chatSessionsTable.createdAt));

            return {
                document: document[0],
                sessions
            };
        } catch (error) {
            console.error('Error fetching document with sessions:', error);
            throw new Error('Failed to fetch document data');
        }
    }

    // Get chat history for a session
    static async getChatHistory(sessionId: number) {
        try {
            const history = await db.select()
                .from(chatHistoryTable)
                .where(eq(chatHistoryTable.sessionId, sessionId))
                .orderBy(chatHistoryTable.createdAt);

            return history;
        } catch (error) {
            console.error('Error fetching chat history:', error);
            throw new Error('Failed to fetch chat history');
        }
    }

    // Get suggested questions for a document
    static async getSuggestedQuestions(documentId: number) {
        try {
            const questions = await db.select()
                .from(suggestedQuestionsTable)
                .where(eq(suggestedQuestionsTable.documentId, documentId))
                .orderBy(suggestedQuestionsTable.questionOrder);

            return questions.map(q => q.question);
        } catch (error) {
            console.error('Error fetching suggested questions:', error);
            throw new Error('Failed to fetch suggested questions');
        }
    }

    // Get user's recent activity (documents and chats)
    static async getUserActivity(userId: string, limit: number = 20) {
        try {
            const documents = await db.select({
                id: documentsTable.id,
                title: documentsTable.title,
                contentLength: documentsTable.contentLength,
                documentType: documentsTable.documentType,
                fileName: documentsTable.fileName,
                createdAt: documentsTable.createdAt,
            })
                .from(documentsTable)
                .where(eq(documentsTable.userId, userId))
                .orderBy(desc(documentsTable.createdAt))
                .limit(limit);

            return documents.map(doc => ({
                ...doc,
                type: 'document' as const
            }));
        } catch (error) {
            console.error('Error fetching user activity:', error);
            throw new Error('Failed to fetch user activity');
        }
    }

    // Delete document and all related data
    static async deleteDocument(documentId: number, userId: string) {
        try {
            // First verify the document belongs to the user
            const document = await db.select()
                .from(documentsTable)
                .where(and(
                    eq(documentsTable.id, documentId),
                    eq(documentsTable.userId, userId)
                ))
                .limit(1);

            if (document.length === 0) {
                throw new Error('Document not found or access denied');
            }

            // Get all chat sessions for this document
            const sessions = await db.select()
                .from(chatSessionsTable)
                .where(eq(chatSessionsTable.documentId, documentId));

            // Delete chat history for all sessions
            for (const session of sessions) {
                await db.delete(chatHistoryTable).where(eq(chatHistoryTable.sessionId, session.id));
            }

            // Delete chat sessions
            await db.delete(chatSessionsTable).where(eq(chatSessionsTable.documentId, documentId));

            // Delete suggested questions
            await db.delete(suggestedQuestionsTable).where(eq(suggestedQuestionsTable.documentId, documentId));

            // Finally delete the document
            await db.delete(documentsTable).where(eq(documentsTable.id, documentId));

            return { success: true, message: 'Document and all related data deleted successfully' };
        } catch (error) {
            console.error('Error deleting document:', error);
            throw new Error('Failed to delete document');
        }
    }

    // Delete chat session and its history
    static async deleteChatSession(sessionId: number, userId: string) {
        try {
            // First verify the session belongs to the user
            const session = await db.select({
                id: chatSessionsTable.id,
                userId: documentsTable.userId
            })
                .from(chatSessionsTable)
                .innerJoin(documentsTable, eq(chatSessionsTable.documentId, documentsTable.id))
                .where(and(
                    eq(chatSessionsTable.id, sessionId),
                    eq(documentsTable.userId, userId)
                ))
                .limit(1);

            if (session.length === 0) {
                throw new Error('Chat session not found or access denied');
            }

            // Delete chat history
            await db.delete(chatHistoryTable).where(eq(chatHistoryTable.sessionId, sessionId));

            // Delete chat session
            await db.delete(chatSessionsTable).where(eq(chatSessionsTable.id, sessionId));

            return { success: true, message: 'Chat session deleted successfully' };
        } catch (error) {
            console.error('Error deleting chat session:', error);
            throw new Error('Failed to delete chat session');
        }
    }

    // Search user's documents by title or content
    static async searchDocuments(userId: string, searchTerm: string, limit: number = 10) {
        try {
            const documents = await db.select()
                .from(documentsTable)
                .where(and(
                    eq(documentsTable.userId, userId),
                    // Simple search in title and content
                    // Note: For better search, consider using full-text search capabilities
                ))
                .orderBy(desc(documentsTable.createdAt))
                .limit(limit);

            // Filter documents that contain the search term (case-insensitive)
            const filteredDocs = documents.filter(doc =>
                doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.fileName?.toLowerCase().includes(searchTerm.toLowerCase())
            );

            return filteredDocs;
        } catch (error) {
            console.error('Error searching documents:', error);
            throw new Error('Failed to search documents');
        }
    }
}
