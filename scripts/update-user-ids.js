const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

// Workaround for SSL certificate issue
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL);

async function updateUserIds() {
    try {
        console.log('🔄 User ID Update Script\n');

        const oldUserId = 'user_33002vf8k5j8492cyKqmg5bBcmd';

        // Get the new user ID from command line argument
        const newUserId = process.argv[2];

        if (!newUserId) {
            console.log('❌ Please provide your current Clerk user ID as an argument');
            console.log('\n👉 EASY WAY to get your user ID:');
            console.log('   1. Make sure the dev server is running (yarn dev)');
            console.log('   2. Sign in to the app at http://localhost:3002');
            console.log('   3. Visit: http://localhost:3002/api/current-user-id');
            console.log('   4. Copy the "currentUserId" value from the JSON response');
            console.log('\n👉 ALTERNATIVE way (using browser console):');
            console.log('   1. Make sure the dev server is running (yarn dev)');
            console.log('   2. Sign in to the app at http://localhost:3002');
            console.log('   3. Open browser developer tools (F12)');
            console.log('   4. Go to the History tab (📊 History)');
            console.log('   5. Look for the log: "🔍 API: User ID from auth: [your_user_id]"');
            console.log('   6. Copy that user ID');
            console.log('\n🚀 Then run: node scripts/update-user-ids.js YOUR_USER_ID');
            console.log('\n📋 Current data in database:');

            // Show current data
            const documentsCount = await sql`SELECT COUNT(*) as count FROM documents WHERE "userId" = ${oldUserId}`;
            const sessionsCount = await sql`SELECT COUNT(*) as count FROM "chatSessions" WHERE "userId" = ${oldUserId}`;
            const historyCount = await sql`
        SELECT COUNT(*) as count 
        FROM "chatHistory" ch
        JOIN "chatSessions" cs ON ch."sessionId" = cs.id
        WHERE cs."userId" = ${oldUserId}
      `;

            console.log(`   📄 Documents: ${documentsCount[0].count}`);
            console.log(`   💬 Chat Sessions: ${sessionsCount[0].count}`);
            console.log(`   📝 Chat History: ${historyCount[0].count}`);
            console.log(`   👤 Old User ID: ${oldUserId}`);

            return;
        }

        console.log(`📋 Old User ID: ${oldUserId}`);
        console.log(`📋 New User ID: ${newUserId}\n`);

        // Check current data
        console.log('🔍 Checking current data...');
        const documentsCount = await sql`SELECT COUNT(*) as count FROM documents WHERE "userId" = ${oldUserId}`;
        const sessionsCount = await sql`SELECT COUNT(*) as count FROM "chatSessions" WHERE "userId" = ${oldUserId}`;

        console.log(`📄 Documents to update: ${documentsCount[0].count}`);
        console.log(`💬 Chat sessions to update: ${sessionsCount[0].count}`);

        if (documentsCount[0].count === 0 && sessionsCount[0].count === 0) {
            console.log('✅ No records found with old user ID. Nothing to update.');
            return;
        }

        console.log('\n🚀 Starting update...');

        // Update documents table
        console.log('📄 Updating documents table...');
        await sql`
      UPDATE documents 
      SET "userId" = ${newUserId} 
      WHERE "userId" = ${oldUserId}
    `;
        console.log(`✅ Updated documents`);

        // Update chatSessions table
        console.log('💬 Updating chat sessions table...');
        await sql`
      UPDATE "chatSessions" 
      SET "userId" = ${newUserId} 
      WHERE "userId" = ${oldUserId}
    `;
        console.log(`✅ Updated chat sessions`);

        // Verify the updates
        console.log('\n🔍 Verifying updates...');
        const newDocumentsCount = await sql`SELECT COUNT(*) as count FROM documents WHERE "userId" = ${newUserId}`;
        const newSessionsCount = await sql`SELECT COUNT(*) as count FROM "chatSessions" WHERE "userId" = ${newUserId}`;
        const historyCount = await sql`
      SELECT COUNT(*) as count 
      FROM "chatHistory" ch
      JOIN "chatSessions" cs ON ch."sessionId" = cs.id
      WHERE cs."userId" = ${newUserId}
    `;

        console.log(`📄 Documents with new user ID: ${newDocumentsCount[0].count}`);
        console.log(`💬 Chat sessions with new user ID: ${newSessionsCount[0].count}`);
        console.log(`📝 Chat history entries accessible: ${historyCount[0].count}`);

        console.log('\n🎉 User ID update completed successfully!');
        console.log('👉 Now refresh your browser and check the History tab - your Q&A history should appear!');

    } catch (error) {
        console.error('❌ Error updating user IDs:', error);
    }
}

updateUserIds();
