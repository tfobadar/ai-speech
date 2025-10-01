import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        console.log('PDF processing API called');

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            console.log('No file provided');
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        console.log(`Processing PDF: ${file.name}, size: ${file.size} bytes`);

        try {
            // Create buffer for PDF processing
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            console.log('Attempting PDF text extraction...');

            // Method 1: Try simple text extraction from PDF bytes
            try {
                console.log('Trying simple text extraction...');

                // Convert buffer to string and look for text patterns
                const pdfString = buffer.toString('latin1');

                // Extract text between parentheses (common PDF text encoding)
                const textMatches = pdfString.match(/\(([^)]*)\)/g);

                if (textMatches && textMatches.length > 5) {
                    const extractedText = textMatches
                        .map(match => match.slice(1, -1)) // Remove parentheses
                        .filter(text => text.length > 1 && /[a-zA-Z]/.test(text)) // Filter meaningful text
                        .join(' ')
                        .replace(/\s+/g, ' ') // Normalize whitespace
                        .trim();

                    if (extractedText.length > 50) {
                        console.log(`PDF processed successfully: ${extractedText.length} characters`);

                        return NextResponse.json({
                            text: extractedText,
                            pages: 'unknown',
                            characters: extractedText.length,
                            method: 'simple-extraction',
                            success: true
                        });
                    }
                }

                throw new Error('Simple extraction failed - no meaningful text found');

            } catch (simpleError) {
                console.log('Simple extraction failed, trying alternative method...', simpleError);

                // Method 2: Try to extract visible text patterns
                try {
                    const pdfString = buffer.toString('latin1');

                    // Look for text content patterns in PDF
                    const textRegex = /[A-Za-z]{3,}/g;
                    const words = pdfString.match(textRegex) || [];

                    if (words.length > 10) {
                        const extractedText = words
                            .filter(word => word.length > 2)
                            .slice(0, 200) // Limit to first 200 words
                            .join(' ')
                            .trim();

                        if (extractedText.length > 50) {
                            console.log(`PDF processed with alternative method: ${extractedText.length} characters`);

                            return NextResponse.json({
                                text: extractedText,
                                pages: 'unknown',
                                characters: extractedText.length,
                                method: 'pattern-extraction',
                                success: true
                            });
                        }
                    }

                    throw new Error('Pattern extraction failed');

                } catch (patternError) {
                    console.log('All extraction methods failed:', patternError);
                    throw new Error('PDF text extraction not supported for this file type');
                }
            }

        } catch (parseError) {
            console.error('PDF processing failed:', parseError);

            // Return manual guidance when automatic extraction fails
            return NextResponse.json({
                error: 'PDF text extraction failed',
                details: 'Unable to automatically extract text from this PDF. Please copy the text manually for best results.',
                fallback: true,
                guidance: {
                    title: '📋 Manual text extraction:',
                    steps: [
                        '1. Open your PDF file',
                        '2. Select all text (Ctrl+A or Cmd+A)',
                        '3. Copy the text (Ctrl+C or Cmd+C)',
                        '4. Paste it in the text area below (Ctrl+V or Cmd+V)'
                    ]
                },
                technical: parseError instanceof Error ? parseError.message : 'PDF processing failed'
            }, { status: 422 });
        }
    } catch (error) {
        console.error('General PDF processing error:', error);
        return NextResponse.json({
            error: 'Failed to process PDF file',
            details: error instanceof Error ? error.message : 'Unknown error occurred',
            fallback: true
        }, { status: 500 });
    }
}