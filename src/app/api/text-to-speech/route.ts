import { NextRequest, NextResponse } from 'next/server';
import { TextToSpeechService } from '@/lib/text-to-speech-service';

const TTS_API_KEY = process.env.GOOGLE_AI_API_KEY || 'AIzaSyBL3NDaNPLIJDTuEB00pk8CbBqAUFPa9nE';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, voice, speed, language } = body;

        // Validate required fields
        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                { error: 'Text is required and must be a string' },
                { status: 400 }
            );
        }

        // Validate text length
        if (text.length > 4000) {
            return NextResponse.json(
                { error: 'Text is too long. Maximum 4000 characters allowed.' },
                { status: 400 }
            );
        }

        // Validate speed
        if (speed && (speed < 0.25 || speed > 4.0)) {
            return NextResponse.json(
                { error: 'Speed must be between 0.25 and 4.0' },
                { status: 400 }
            );
        }

        const ttsService = new TextToSpeechService(TTS_API_KEY);

        const result = await ttsService.generateSpeech({
            text,
            voice: voice || 'alloy',
            speed: speed || 1.0,
            language: language || 'en-US'
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('Text-to-Speech API error:', error);

        return NextResponse.json(
            {
                error: 'Internal server error. Please try again.',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json(
        {
            message: 'Text-to-Speech API',
            endpoints: {
                POST: '/api/text-to-speech - Generate speech from text'
            }
        },
        { status: 200 }
    );
}
