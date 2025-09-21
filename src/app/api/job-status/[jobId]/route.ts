import { NextRequest, NextResponse } from 'next/server';
import { videoService } from '@/lib/video-service';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params;

        if (!jobId) {
            return NextResponse.json(
                { error: 'Job ID is required' },
                { status: 400 }
            );
        }

        const result = await videoService.getJobStatus(jobId);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error checking job status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
