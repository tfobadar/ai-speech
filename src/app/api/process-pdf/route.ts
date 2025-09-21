import { NextRequest, NextResponse } from 'next/server';

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

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log('Buffer created, attempting PDF parsing...');

        try {
            // Dynamic import to handle potential module issues
            const pdfParse = (await import('pdf-parse')).default;
            console.log('pdf-parse imported successfully');

            // Parse the PDF
            const data = await pdfParse(buffer);
            console.log(`PDF parsed successfully: ${data.numpages} pages, ${data.text.length} characters`);

            // Return success response
            return NextResponse.json({
                text: data.text,
                pages: data.numpages,
                characters: data.text.length,
                success: true
            });

        } catch (parseError) {
            console.error('PDF parsing failed:', parseError);

            // Return a helpful fallback response
            return NextResponse.json({
                error: 'PDF processing temporarily unavailable',
                details: 'Our PDF reader is having technical difficulties. Please copy the text from your PDF and paste it directly into the text area.',
                fallback: true,
                technical: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
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