import { NextRequest, NextResponse } from 'next/server';
import { genAI } from '@/lib/google-ai';

export async function GET(request: NextRequest) {
    try {
        console.log('[TEST-AI] Starting Google AI test');

        // Initialize the model - try latest available model
        let model;
        let modelName = 'unknown';

        // Try different model names to find working one
        const modelOptions = [
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro-latest',
            'gemini-1.0-pro',
            'gemini-pro-vision',
            'text-bison-001'
        ];

        for (const modelOption of modelOptions) {
            try {
                model = genAI.getGenerativeModel({ model: modelOption });
                modelName = modelOption;
                console.log('[TEST-AI] Successfully initialized model:', modelName);
                break;
            } catch (err) {
                console.log('[TEST-AI] Failed to initialize model:', modelOption);
                continue;
            }
        }

        if (!model) {
            throw new Error('No working model found');
        }

        console.log('[TEST-AI] Using model:', modelName);

        // Test with a simple prompt
        const prompt = 'Say hello and confirm you can respond. Just respond with: "Hello! Google AI is working correctly."';

        console.log('[TEST-AI] Sending test prompt to AI');
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        console.log('[TEST-AI] Received response:', response);

        return NextResponse.json({
            success: true,
            message: 'Google AI API test successful',
            workingModel: modelName,
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
