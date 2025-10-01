import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        console.log('Image OCR API called');

        const body = await request.json();
        const { text, fileName, fileSize, fileType } = body;

        if (!text) {
            console.log('No text provided');
            return NextResponse.json({ error: 'No text provided' }, { status: 400 });
        }

        console.log(`Processing extracted text from: ${fileName}, size: ${fileSize} bytes, type: ${fileType}`);

        const extractedText = text.trim();

        if (!extractedText || extractedText.length === 0) {
            return NextResponse.json({
                error: 'No text found',
                details: 'No readable text was detected in this image. Please ensure the image contains clear, readable text.',
                fallback: true
            }, { status: 422 });
        }

        console.log(`OCR completed successfully: ${extractedText.length} characters extracted`);

        return NextResponse.json({
            text: extractedText,
            characters: extractedText.length,
            method: 'client-side-ocr',
            success: true,
            fileName: fileName,
            fileSize: fileSize,
            fileType: fileType
        });

    } catch (error) {
        console.error('General image processing error:', error);
        return NextResponse.json({
            error: 'Failed to process image',
            details: error instanceof Error ? error.message : 'Unknown error occurred',
            fallback: true
        }, { status: 500 });
    }
}
