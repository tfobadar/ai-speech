const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

// Workaround for SSL certificate issue
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL);

async function checkDatabase() {
    try {
        console.log('🔍 Checking database contents...\n');

        // Check unique user IDs in documents
        const userIds = await sql`SELECT DISTINCT "userId" FROM documents ORDER BY "userId"`;
        console.log('👤 Unique User IDs in documents:', userIds.map(u => u.userId));

        // Check documents
        const documents = await sql`SELECT * FROM documents ORDER BY id`;
        console.log('\n📄 Documents:', documents.length);
        if (documents.length > 0) {
            console.log('Sample document (userId):', documents[0].userId);
            console.log('All document userIds:', documents.map(d => d.userId));
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
