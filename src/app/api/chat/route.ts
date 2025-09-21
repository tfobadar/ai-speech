import { NextRequest, NextResponse } from 'next/server';
import { genAI } from '@/lib/google-ai';

export async function POST(request: NextRequest) {
    try {
        const { question, context } = await request.json();

        if (!question || typeof question !== 'string') {
            return NextResponse.json(
                { error: 'Question is required and must be a string' },
                { status: 400 }
            );
        }

        if (!context || typeof context !== 'string') {
            return NextResponse.json(
                { error: 'Document context is required to answer questions' },
                { status: 400 }
            );
        }

        if (context.length < 20) {
            return NextResponse.json(
                { error: 'Document context is too short to answer questions meaningfully' },
                { status: 400 }
            );
        }

        // Initialize the model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a helpful assistant that answers questions based on a specific document or text. Please answer the user's question using ONLY the information provided in the document context below. If the answer cannot be found in the document, clearly state that the information is not available in the provided text.

Document Context:
${context}

User Question: ${question}

Instructions:
1. Base your answer ONLY on the provided document context
2. If the information is not in the document, say "I cannot find this information in the provided document"
3. Keep your answer concise and relevant
4. Quote specific parts of the document when applicable
5. Make your response suitable for text-to-speech (clear and well-structured)

Answer:`;

        // Generate answer
        const result = await model.generateContent(prompt);
        const answer = result.response.text();

        if (!answer || answer.trim().length === 0) {
            return NextResponse.json(
                { error: 'Failed to generate answer' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            answer: answer.trim(),
            question: question,
            contextLength: context.length,
            success: true
        });

    } catch (error) {
        console.error('Chat error:', error);

        if (error instanceof Error && error.message.includes('API_KEY')) {
            return NextResponse.json(
                { error: 'Google AI API key not configured. Please check your environment variables.' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to process your question. Please try again.' },
            { status: 500 }
        );
    }
}
