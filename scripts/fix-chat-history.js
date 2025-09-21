#!/usr/bin/env node

const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

// Workaround for SSL certificate issue
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL);

async function fixChatHistoryData() {
    console.log('🚀 Chat History Data Fix Tool');
    console.log('============================\n');

    try {
        const oldUserId = 'user_33002vf8k5j8492cyKqmg5bBcmd';

        // Check current data
        console.log('📋 Checking current database state...');

        const documentsCount = await sql`SELECT COUNT(*) as count FROM documents WHERE "userId" = ${oldUserId}`;
        const sessionsCount = await sql`SELECT COUNT(*) as count FROM "chatSessions" WHERE "userId" = ${oldUserId}`;
        const historyCount = await sql`
            SELECT COUNT(*) as count 
            FROM "chatHistory" ch
            JOIN "chatSessions" cs ON ch."sessionId" = cs.id
            WHERE cs."userId" = ${oldUserId}
        `;

        console.log(`📄 Documents under old user ID: ${documentsCount[0].count}`);
        console.log(`💬 Chat Sessions under old user ID: ${sessionsCount[0].count}`);
        console.log(`📝 Chat History entries linked to old user ID: ${historyCount[0].count}`);
        console.log(`👤 Old User ID: ${oldUserId}\n`);

        if (documentsCount[0].count === 0) {
            console.log('✅ No data found under old user ID. Your data may already be correctly assigned!');
            console.log('🔍 Let me check what user IDs exist in the system...\n');

            const allUsers = await sql`
                SELECT DISTINCT "userId" FROM documents 
                UNION 
                SELECT DISTINCT "userId" FROM "chatSessions"
                ORDER BY "userId"
            `;

            console.log('👥 All user IDs in the system:');
            allUsers.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.userId}`);
            });

            if (allUsers.length === 0) {
                console.log('❌ No data found in the database at all!');
            } else {
                console.log('\n💡 If none of these match your current Clerk user ID, you may need to create new content.');
            }
            return;
        }

        // Get command line argument for new user ID
        const newUserId = process.argv[2];

        if (!newUserId) {
            console.log('❌ No user ID provided as command line argument.');
            console.log('\n🎯 TO GET YOUR CURRENT USER ID:');
            console.log('1. Make sure your dev server is running (yarn dev)');
            console.log('2. Open http://localhost:3000/api/current-user-id in your browser after signing in');
            console.log('3. Copy the "currentUserId" value');
            console.log('4. Run: node scripts/fix-chat-history.js YOUR_USER_ID');
            console.log('\n📱 Alternative: Sign in to your app, go to History tab, check browser console for user ID');
            return;
        }

        console.log(`🔄 Transferring data from ${oldUserId} to ${newUserId}...\n`);

        // Update documents
        console.log('📄 Updating documents...');
        await sql`UPDATE documents SET "userId" = ${newUserId} WHERE "userId" = ${oldUserId}`;

        // Update chat sessions  
        console.log('💬 Updating chat sessions...');
        await sql`UPDATE "chatSessions" SET "userId" = ${newUserId} WHERE "userId" = ${oldUserId}`;

        // Verify the transfer
        console.log('✅ Verifying transfer...');
        const newDocsCount = await sql`SELECT COUNT(*) as count FROM documents WHERE "userId" = ${newUserId}`;
        const newSessionsCount = await sql`SELECT COUNT(*) as count FROM "chatSessions" WHERE "userId" = ${newUserId}`;
        const newHistoryCount = await sql`
            SELECT COUNT(*) as count 
            FROM "chatHistory" ch
            JOIN "chatSessions" cs ON ch."sessionId" = cs.id
            WHERE cs."userId" = ${newUserId}
        `;

        console.log(`\n🎉 SUCCESS! Transfer completed:`);
        console.log(`📄 Documents now assigned to ${newUserId}: ${newDocsCount[0].count}`);
        console.log(`💬 Chat sessions now assigned to ${newUserId}: ${newSessionsCount[0].count}`);
        console.log(`📝 Chat history entries now accessible: ${newHistoryCount[0].count}`);

        console.log(`\n👉 Now refresh your browser and check the History tab - your Q&A should appear!`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixChatHistoryData();
