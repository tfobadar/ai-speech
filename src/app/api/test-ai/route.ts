import { NextRequest, NextResponse } from 'next/server';
import { genAI } from '@/lib/google-ai';

export async function GET(request: NextRequest) {
    try {
        console.log('[TEST-AI] Starting Google AI test');

        // Initialize the model
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        console.log('[TEST-AI] Model initialized successfully');

        // Test with a simple prompt
        const prompt = 'Say hello and confirm you can respond. Just respond with: "Hello! Google AI is working correctly."';

        console.log('[TEST-AI] Sending test prompt to AI');
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        console.log('[TEST-AI] Received response:', response);

        return NextResponse.json({
            success: true,
            message: 'Google AI API test successful',
            aiResponse: response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[TEST-AI] Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            type: typeof error,
            error: error
        });

        return NextResponse.json(
            {
                success: false,
                error: 'Google AI API test failed',
                details: error instanceof Error ? error.message : 'Unknown error occurred',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
