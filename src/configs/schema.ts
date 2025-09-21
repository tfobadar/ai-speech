import { integer, pgTable, varchar, boolean, text, timestamp, serial } from "drizzle-orm/pg-core";

export const Users = pgTable("users", {
    id: varchar("id", { length: 256 }).primaryKey().notNull(), // Changed from integer to varchar to match Clerk user IDs
    name: varchar("name", { length: 256 }).notNull(),
    email: varchar("email", { length: 256 }).notNull().unique(),
    imageUrl: varchar("imageUrl"),
    subscription: boolean("subscription").default(false),
});

export const documentsTable = pgTable("documents", {
    id: serial("id").primaryKey(),
    userId: varchar("userId", { length: 256 }).notNull(),
    title: varchar("title", { length: 500 }),
    content: text("content").notNull(),
    summary: text("summary"),
    contentLength: integer("contentLength"),
    documentType: varchar("documentType", { length: 50 }), // 'text', 'pdf', 'doc', etc.
    fileName: varchar("fileName", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
});

export const chatSessionsTable = pgTable("chatSessions", {
    id: serial("id").primaryKey(),
    userId: varchar("userId", { length: 256 }).notNull(),
    documentId: integer("documentId").references(() => documentsTable.id),
    sessionName: varchar("sessionName", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
});

export const chatHistoryTable = pgTable("chatHistory", {
    id: serial("id").primaryKey(),
    sessionId: integer("sessionId").references(() => chatSessionsTable.id),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    suggestedQuestion: boolean("suggestedQuestion").default(false),
    createdAt: timestamp("createdAt").defaultNow(),
});

export const suggestedQuestionsTable = pgTable("suggestedQuestions", {
    id: serial("id").primaryKey(),
    documentId: integer("documentId").references(() => documentsTable.id),
    question: text("question").notNull(),
    questionOrder: integer("questionOrder"),
    createdAt: timestamp("createdAt").defaultNow(),
});
