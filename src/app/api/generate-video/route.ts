import { NextRequest, NextResponse } from 'next/server';
import { videoService } from '@/lib/video-service';
import { VideoGenerationRequest } from '@/types/video';
import { validateVideoRequest } from '@/lib/video-utils';

export async function POST(request: NextRequest) {
    try {
        const body: VideoGenerationRequest = await request.json();

        // Validate request using utility function
        const validationErrors = validateVideoRequest(body);
        if (validationErrors.length > 0) {
            return NextResponse.json(
                { error: `Validation failed: ${validationErrors.join(', ')}` },
                { status: 400 }
            );
        }

        // Log the request for debugging
        console.log('Video generation request:', {
            promptLength: body.prompt.length,
            style: body.style,
            duration: body.duration,
            includeAudio: body.includeAudio
        });

        const result = await videoService.generateVideo(body);

        // Log the result
        console.log('Video generation result:', {
            status: result.status,
            jobId: result.jobId,
            hasError: !!result.error
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in video generation API:', error);

        // Return appropriate error response
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}