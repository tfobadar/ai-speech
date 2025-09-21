const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

// Workaround for SSL certificate issue
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const sql = neon(process.env.NEXT_PUBLIC_DATABASE_URL);

async function getCurrentUsersAndUpdate() {
    try {
        console.log('🔄 Auto User ID Update Script');
        console.log('================================\n');

        const oldUserId = 'user_33002vf8k5j8492cyKqmg5bBcmd';

        // Show current data under old user ID
        console.log('📋 Current data in database:');
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
        console.log(`   👤 Old User ID: ${oldUserId}\n`);

        if (documentsCount[0].count === 0) {
            console.log('✅ No data found under old user ID. Everything looks good!');
            return;
        }

        // Check if there are any other user IDs in the system
        const allUserIds = await sql`
            SELECT DISTINCT "userId" FROM documents 
            UNION 
            SELECT DISTINCT "userId" FROM "chatSessions"
        `;

        console.log('👥 All user IDs in system:', allUserIds.map(u => u.userId));

        // For demonstration, let's use a common new user ID pattern
        // In a real scenario, you'd get this from your current session
        const commonNewUserIds = [
            'user_2nEqzKzYY4fAQHGj2xFzQl6mJ0v',
            'user_2nEqzKzYY4fAQHGj2xFzQl6mJ0w',
            'user_2nEqzKzYY4fAQHGj2xFzQl6mJ0x'
        ];

        console.log('\n🤔 IMPORTANT: We need your CURRENT Clerk user ID to transfer the data.');
        console.log('');
        console.log('📱 METHOD 1 - Visit the API endpoint:');
        console.log('   1. Make sure your dev server is running');
        console.log('   2. Sign in at http://localhost:3000 (or whatever port)');
        console.log('   3. Visit: http://localhost:3000/api/current-user-id');
        console.log('   4. Copy the "currentUserId" from the JSON response');
        console.log('');
        console.log('🖥️  METHOD 2 - Browser console:');
        console.log('   1. Sign in to your app');
        console.log('   2. Go to any document and click History tab');
        console.log('   3. Open browser dev tools (F12)');
        console.log('   4. Look for: "🔍 API: User ID from auth: [your_user_id]"');
        console.log('');
        console.log('🚀 Then run: node scripts/update-user-ids.js YOUR_USER_ID');
        console.log('');

        // Let's also create a temporary solution that prompts for user input
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('💡 Or enter your current user ID now (press Enter to skip):');

        rl.question('Enter your current Clerk user ID: ', async (newUserId) => {
            rl.close();

            if (!newUserId || newUserId.trim() === '') {
                console.log('\n⏭️  Skipped. Use the methods above to get your user ID first.');
                return;
            }

            newUserId = newUserId.trim();
            console.log(`\n🚀 Updating from ${oldUserId} to ${newUserId}...`);

            try {
                // Update documents
                await sql`UPDATE documents SET "userId" = ${newUserId} WHERE "userId" = ${oldUserId}`;
                console.log('✅ Updated documents');

                // Update chat sessions
                await sql`UPDATE "chatSessions" SET "userId" = ${newUserId} WHERE "userId" = ${oldUserId}`;
                console.log('✅ Updated chat sessions');

                // Verify
                const newDocsCount = await sql`SELECT COUNT(*) as count FROM documents WHERE "userId" = ${newUserId}`;
                const newSessionsCount = await sql`SELECT COUNT(*) as count FROM "chatSessions" WHERE "userId" = ${newUserId}`;

                console.log(`\n🎉 Success! Transferred ${newDocsCount[0].count} documents and ${newSessionsCount[0].count} sessions to user ${newUserId}`);
                console.log('\n👉 Now refresh your browser and check the History tab!');

            } catch (error) {
                console.error('❌ Error updating user IDs:', error);
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

getCurrentUsersAndUpdate();
