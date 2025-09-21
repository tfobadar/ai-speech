const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL);

async function createTables() {
    try {
        console.log('Creating tables...');

        // Create users table
        await sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" varchar(256) PRIMARY KEY NOT NULL,
        "name" varchar(256) NOT NULL,
        "email" varchar(256) NOT NULL,
        "imageUrl" varchar,
        "subscription" boolean DEFAULT false,
        CONSTRAINT "users_email_unique" UNIQUE("email")
      )
    `;
        console.log('✓ Users table created');

        // Create documents table
        await sql`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" serial PRIMARY KEY NOT NULL,
        "userId" varchar(256) NOT NULL,
        "title" varchar(500),
        "content" text NOT NULL,
        "summary" text,
        "contentLength" integer,
        "documentType" varchar(50),
        "fileName" varchar(500),
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      )
    `;
        console.log('✓ Documents table created');

        // Create chatSessions table
        await sql`
      CREATE TABLE IF NOT EXISTS "chatSessions" (
        "id" serial PRIMARY KEY NOT NULL,
        "userId" varchar(256) NOT NULL,
        "documentId" integer,
        "sessionName" varchar(500),
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      )
    `;
        console.log('✓ Chat sessions table created');

        // Create chatHistory table
        await sql`
      CREATE TABLE IF NOT EXISTS "chatHistory" (
        "id" serial PRIMARY KEY NOT NULL,
        "sessionId" integer,
        "question" text NOT NULL,
        "answer" text NOT NULL,
        "suggestedQuestion" boolean DEFAULT false,
        "createdAt" timestamp DEFAULT now()
      )
    `;
        console.log('✓ Chat history table created');

        // Create suggestedQuestions table
        await sql`
      CREATE TABLE IF NOT EXISTS "suggestedQuestions" (
        "id" serial PRIMARY KEY NOT NULL,
        "documentId" integer,
        "question" text NOT NULL,
        "questionOrder" integer,
        "createdAt" timestamp DEFAULT now()
      )
    `;
        console.log('✓ Suggested questions table created');

        // Add foreign key constraints
        try {
            await sql`
        ALTER TABLE "chatSessions" 
        ADD CONSTRAINT "chatSessions_documentId_documents_id_fk" 
        FOREIGN KEY ("documentId") REFERENCES "documents"("id") 
        ON DELETE no action ON UPDATE no action
      `;
            console.log('✓ Chat sessions foreign key added');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('✓ Chat sessions foreign key already exists');
            } else {
                console.log('! Chat sessions foreign key error:', err.message);
            }
        }

        try {
            await sql`
        ALTER TABLE "chatHistory" 
        ADD CONSTRAINT "chatHistory_sessionId_chatSessions_id_fk" 
        FOREIGN KEY ("sessionId") REFERENCES "chatSessions"("id") 
        ON DELETE no action ON UPDATE no action
      `;
            console.log('✓ Chat history foreign key added');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('✓ Chat history foreign key already exists');
            } else {
                console.log('! Chat history foreign key error:', err.message);
            }
        }

        try {
            await sql`
        ALTER TABLE "suggestedQuestions" 
        ADD CONSTRAINT "suggestedQuestions_documentId_documents_id_fk" 
        FOREIGN KEY ("documentId") REFERENCES "documents"("id") 
        ON DELETE no action ON UPDATE no action
      `;
            console.log('✓ Suggested questions foreign key added');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('✓ Suggested questions foreign key already exists');
            } else {
                console.log('! Suggested questions foreign key error:', err.message);
            }
        }

        console.log('\n🎉 All tables created successfully!');

        // Test the tables
        console.log('\n📋 Checking tables...');
        const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

        console.log('Tables in database:');
        tables.forEach(table => {
            console.log(`  - ${table.table_name}`);
        });

    } catch (error) {
        console.error('❌ Error creating tables:', error);
    }
}

createTables();
