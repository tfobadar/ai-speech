const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL);

async function checkDatabase() {
    try {
        console.log('🔍 Checking database contents...\n');

        // Check documents
        const documents = await sql`SELECT * FROM documents ORDER BY id`;
        console.log('📄 Documents:', documents.length);
        if (documents.length > 0) {
            console.log('Sample document:', documents[0]);
        }

        // Check chat sessions
        const sessions = await sql`SELECT * FROM "chatSessions" ORDER BY id`;
        console.log('\n💬 Chat Sessions:', sessions.length);
        if (sessions.length > 0) {
            console.log('Sample session:', sessions[0]);
        }

        // Check chat history
        const history = await sql`SELECT * FROM "chatHistory" ORDER BY id`;
        console.log('\n📝 Chat History entries:', history.length);
        if (history.length > 0) {
            console.log('Sample history:', history[0]);
        }

        // Check suggested questions
        const suggested = await sql`SELECT * FROM "suggestedQuestions" ORDER BY id`;
        console.log('\n💡 Suggested Questions:', suggested.length);
        if (suggested.length > 0) {
            console.log('Sample question:', suggested[0]);
        }

        // Check users
        const users = await sql`SELECT * FROM users ORDER BY id`;
        console.log('\n👤 Users:', users.length);
        if (users.length > 0) {
            console.log('Sample user:', users[0]);
        }

    } catch (error) {
        console.error('❌ Error checking database:', error);
    }
}

checkDatabase();
