import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({
                error: 'Not authenticated',
                message: 'Please sign in first'
            }, { status: 401 });
        }

        return NextResponse.json({
            success: true,
            currentUserId: userId,
            message: 'This is your current Clerk user ID',
            instructions: [
                'Copy the currentUserId value above',
                'Run this command in your terminal:',
                `node scripts/update-user-ids.js ${userId}`,
                'This will transfer your chat history to your current user account'
            ]
        });

    } catch (error) {
        console.error('❌ Error getting user ID:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
