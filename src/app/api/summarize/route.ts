import { NextRequest, NextResponse } from 'next/server';
import { genAI } from '@/lib/google-ai';

export async function POST(request: NextRequest) {
    try {
        console.log('[SUMMARIZE] Starting request');

        // Check environment variables first
        const hasGoogleApiKey = !!process.env.GOOGLE_AI_API_KEY;
        console.log('[SUMMARIZE] Google API Key available:', hasGoogleApiKey);

        if (!hasGoogleApiKey) {
            console.error('[SUMMARIZE] Missing GOOGLE_AI_API_KEY');
            return NextResponse.json(
                { error: 'Google AI API key not configured' },
                { status: 500 }
            );
        }

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

        // Initialize the model with error handling
        try {
            const { genAI } = await import('@/lib/google-ai');
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

        } catch (modelError) {
            console.error('[SUMMARIZE] Model initialization or generation error:', modelError);
            return NextResponse.json(
                { error: 'AI model initialization failed. Please check configuration.' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Summarization error:', error);

        if (error instanceof Error && error.message.includes('API_KEY')) {
            return NextResponse.json(
                { error: 'Google AI API key not configured. Please check your environment variables.' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to generate summary. Please try again.' },
            { status: 500 }
        );
    }
}
