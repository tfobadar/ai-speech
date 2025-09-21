import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        // Test if pdf-parse can be imported
        const pdfParse = (await import('pdf-parse')).default;

        return NextResponse.json({
            status: 'ok',
            message: 'PDF processing is available',
            pdfParseLoaded: !!pdfParse
        });

    } catch (error) {
        return NextResponse.json({
            status: 'error',
            message: 'PDF processing not available',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
