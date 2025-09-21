import { NextRequest, NextResponse } from 'next/server';
import { genAI } from '@/lib/google-ai';

export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

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

        // Initialize the model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Please provide a concise and clear summary of the following text. Focus on the main points and key information. Keep the summary between 2-4 sentences and make it suitable for text-to-speech conversion:

${text}`;

        // Generate summary
        const result = await model.generateContent(prompt);
        const summary = result.response.text();

        if (!summary || summary.trim().length === 0) {
            return NextResponse.json(
                { error: 'Failed to generate summary' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            summary: summary.trim(),
            originalLength: text.length,
            summaryLength: summary.trim().length,
            success: true
        });

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
