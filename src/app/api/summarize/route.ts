import { NextRequest, NextResponse } from 'next/server';
import { genAI } from '@/lib/google-ai';

export async function POST(request: NextRequest) {
    try {
        console.log('[SUMMARIZE] Starting request');

        const { text } = await request.json();
        console.log('[SUMMARIZE] Text length:', text?.length || 0);

        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                { error: 'Text is required and must be a string' },
                { status: 400 }
            );
        }

        if (text.length < 50) {
            return NextResponse.json(
                { error: 'Text must be at least 50 characters long to summarize' },
                { status: 400 }
            );
        }

        // Initialize the model - using the most reliable model name
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        console.log('[SUMMARIZE] Model initialized successfully');

        const prompt = `Please provide a concise and clear summary of the following text. Focus on the main points and key information. Keep the summary between 2-4 sentences and make it suitable for text-to-speech conversion:

${text}`;

        // Generate summary
        console.log('[SUMMARIZE] Generating summary...');
        const result = await model.generateContent(prompt);
        const summary = result.response.text();
        console.log('[SUMMARIZE] Generated summary length:', summary?.length || 0);

        if (!summary || summary.trim().length === 0) {
            return NextResponse.json(
                { error: 'Failed to generate summary' },
                { status: 500 }
            );
        }

        console.log('[SUMMARIZE] Summary generated successfully');

        return NextResponse.json({
            summary: summary.trim(),
            originalLength: text.length,
            summaryLength: summary.trim().length,
            success: true
        });

    } catch (error) {
        console.error('[SUMMARIZE] Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            type: typeof error,
            error: error
        });

        // Check if the error is related to Google AI API
        if (error instanceof Error) {
            if (error.message.includes('API_KEY') || error.message.includes('API key')) {
                return NextResponse.json(
                    {
                        error: 'Google AI API key not configured. Please check your environment variables.',
                        details: error.message
                    },
                    { status: 500 }
                );
            }

            if (error.message.includes('PERMISSION_DENIED') || error.message.includes('403')) {
                return NextResponse.json(
                    {
                        error: 'Google AI API access denied. Check API key permissions.',
                        details: error.message
                    },
                    { status: 500 }
                );
            }

            if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('429')) {
                return NextResponse.json(
                    {
                        error: 'Google AI API quota exceeded. Please try again later.',
                        details: error.message
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            {
                error: 'Failed to generate summary. Please try again.',
                details: error instanceof Error ? error.message : 'Unknown error occurred'
            },
            { status: 500 }
        );
    }
}
