import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();

        // Process DOC/DOCX
        const result = await mammoth.extractRawText({ arrayBuffer });

        return NextResponse.json({
            text: result.value,
            characters: result.value.length,
            messages: result.messages
        });

    } catch (error) {
        console.error('DOC processing error:', error);
        return NextResponse.json(
            { error: 'Failed to process DOC/DOCX file' },
            { status: 500 }
        );
    }
}
