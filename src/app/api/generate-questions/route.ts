import { NextRequest, NextResponse } from 'next/server';
import { genAI } from '@/lib/google-ai';

export async function POST(request: NextRequest) {
    try {
        console.log('[GENERATE-QUESTIONS] Starting request');

        const { text } = await request.json();
        console.log('[GENERATE-QUESTIONS] Text length:', text?.length || 0);

        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                { error: 'Text is required and must be a string' },
                { status: 400 }
            );
        }

        if (text.length < 100) {
            return NextResponse.json(
                { error: 'Text must be at least 100 characters long to generate meaningful questions' },
                { status: 400 }
            );
        }

        // Initialize the model - using the working gemini-2.0-flash model
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        console.log('[GENERATE-QUESTIONS] Model initialized successfully');

        // Determine number of questions based on document length
        let questionCount = 3;
        if (text.length > 1000) questionCount = 5;
        if (text.length > 3000) questionCount = 7;
        if (text.length > 5000) questionCount = 10;
        if (text.length > 10000) questionCount = 12;

        console.log('[GENERATE-QUESTIONS] Generating', questionCount, 'questions');

        const prompt = `Based on the following document, generate ${questionCount} thoughtful and relevant questions that someone might ask to better understand the content. The questions should:

1. Cover different aspects of the document (main topics, details, implications, etc.)
2. Be clear and specific
3. Help readers understand key information
4. Range from general overview questions to more specific detail questions
5. Be suitable for someone who wants to learn about the document content

Document Content:
${text}

Please provide exactly ${questionCount} questions in the following JSON format:
{
  "questions": [
    "Question 1 here?",
    "Question 2 here?",
    "Question 3 here?"
  ]
}

Make sure each question:
- Ends with a question mark
- Is clear and well-formed
- Can be answered using the document content
- Covers different aspects of the document`;

        // Generate questions
        const result = await model.generateContent(prompt);
        let response = result.response.text();
        console.log('[GENERATE-QUESTIONS] Raw AI response length:', response.length);

        // Clean up the response to extract JSON
        response = response.trim();

        // Remove markdown code blocks if present
        response = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Try to parse the JSON response
        let questionsData;
        try {
            questionsData = JSON.parse(response);
        } catch (parseError) {
            console.log('[GENERATE-QUESTIONS] JSON parse failed, trying manual extraction');
            // If JSON parsing fails, try to extract questions manually
            const questionMatches = response.match(/"([^"]*\?[^"]*)"/g);
            if (questionMatches) {
                questionsData = {
                    questions: questionMatches.map(q => q.replace(/"/g, ''))
                };
            } else {
                throw new Error('Failed to parse questions from AI response');
            }
        }

        if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
            throw new Error('Invalid questions format received from AI');
        }

        // Ensure we have at least some questions
        if (questionsData.questions.length === 0) {
            throw new Error('No questions were generated');
        }

        console.log('[GENERATE-QUESTIONS] Successfully generated', questionsData.questions.length, 'questions');

        return NextResponse.json({
            questions: questionsData.questions,
            documentLength: text.length,
            questionCount: questionsData.questions.length,
            success: true
        });

    } catch (error) {
        console.error('[GENERATE-QUESTIONS] Error details:', {
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
                error: 'Failed to generate questions. Please try again.',
                details: error instanceof Error ? error.message : 'Unknown error occurred'
            },
            { status: 500 }
        );
    }
}
