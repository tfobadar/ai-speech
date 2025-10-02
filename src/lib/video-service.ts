import { genAI } from '@/lib/google-ai';
import { VideoGenerationRequest, VideoGenerationResponse } from '@/types/video';
import {
    validateVideoRequest,
    createEnhancedPrompt,
    generateJobId,
    estimateProcessingTime,
    VIDEO_STYLES
} from '@/lib/video-utils';

class VideoGenerationService {
    private model;

    constructor() {
        // Using Gemini model for video generation
        this.model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash-exp" });
    }

    async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
        try {
            // Validate the request
            const validationErrors = validateVideoRequest(request);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            const jobId = generateJobId();

            // Create enhanced prompt based on user preferences
            const enhancedPrompt = createEnhancedPrompt(request);

            // Estimate processing time
            const estimatedTime = estimateProcessingTime(
                request.duration,
                request.style,
                request.includeAudio
            );

            console.log(`Starting video generation job ${jobId}`);
            console.log(`Enhanced prompt: ${enhancedPrompt}`);
            console.log(`Estimated processing time: ${estimatedTime} seconds`);

            // For now, we'll simulate the video generation process
            // In a real implementation, you would call Google's video generation API
            const response = await this.simulateVideoGeneration(enhancedPrompt, request, jobId);

            return response;
        } catch (error) {
            console.error('Error generating video:', error);
            return {
                status: 'failed',
                jobId: generateJobId(),
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    private async simulateVideoGeneration(
        prompt: string,
        request: VideoGenerationRequest,
        jobId: string
    ): Promise<VideoGenerationResponse> {
        // Note: Google AI Studio doesn't currently have direct video generation API
        // This implementation uses Gemini to generate video concepts, scripts, and metadata
        // In production, you would integrate with actual video generation services

        try {
            // Create a modified prompt for text generation about video content
            const textPrompt = `As a creative video director, analyze this video request and provide a detailed video concept:

Request: "${request.prompt}"
Style: ${request.style}
Duration: ${request.duration} seconds
Audio: ${request.includeAudio ? 'included' : 'no audio'}

Please provide:
1. A compelling video title (max 60 characters)
2. A detailed scene-by-scene breakdown
3. Visual style guidelines
4. Technical specifications
5. Suggested music/audio elements (if audio is included)

Format your response as a structured video production plan.`;

            console.log('Sending text prompt to Gemini:', textPrompt.substring(0, 100) + '...');

            // Use Gemini for text generation about video concepts
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
            });

            const response = await result.response;
            const videoConceptText = response.text();

            console.log('Generated video concept:', videoConceptText.substring(0, 200) + '...');

            // Simulate processing time based on video complexity
            const processingTime = estimateProcessingTime(
                request.duration,
                request.style,
                request.includeAudio
            );

            await new Promise(resolve => setTimeout(resolve, Math.min(processingTime * 100, 3000))); // Cap at 3 seconds for demo

            // Generate a mock video URL for demonstration
            const mockVideoUrl = `https://example.com/videos/${jobId}.mp4`;

            // For demonstration, simulate successful completion
            // In real implementation, this would be handled asynchronously
            return {
                status: 'completed',
                jobId,
                videoUrl: mockVideoUrl,
                metadata: {
                    title: this.extractTitle(videoConceptText),
                    duration: request.duration,
                    style: request.style,
                    includeAudio: request.includeAudio,
                    concept: videoConceptText,
                    generatedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Error in Google AI call:', error);

            // Provide more specific error information
            let errorMessage = 'Failed to communicate with Google AI Studio';
            let shouldFallback = false;

            if (error instanceof Error) {
                if (error.message.includes('filtered')) {
                    errorMessage = 'Content was filtered by Google AI. Please try a different prompt.';
                } else if (error.message.includes('quota') || error.message.includes('429')) {
                    errorMessage = 'Google AI API quota exceeded. Using fallback video concept generation.';
                    shouldFallback = true;
                } else if (error.message.includes('network')) {
                    errorMessage = 'Network error connecting to Google AI. Please check your connection.';
                } else {
                    errorMessage = `Google AI Error: ${error.message}`;
                }
            }

            // If quota exceeded, provide a fallback response with generated concept
            if (shouldFallback) {
                const fallbackConcept = this.generateFallbackConcept(request);

                return {
                    status: 'completed',
                    jobId,
                    // Don't provide videoUrl for fallback mode since no actual video is generated
                    metadata: {
                        title: this.extractTitle(fallbackConcept),
                        duration: request.duration,
                        style: request.style,
                        includeAudio: request.includeAudio,
                        concept: fallbackConcept,
                        generatedAt: new Date().toISOString(),
                        fallback: true
                    }
                };
            }

            return {
                status: 'failed',
                jobId,
                error: errorMessage
            };
        }
    }

    private generateFallbackConcept(request: VideoGenerationRequest): string {
        const styleInfo = VIDEO_STYLES[request.style as keyof typeof VIDEO_STYLES];

        const audioSection = request.includeAudio
            ? `**Audio Elements:**
- Background music matching the mood
- Ambient sound effects
- Professional audio mixing`
            : `**Note:** Silent video as requested`;

        return `
**Video Title:** ${request.prompt.substring(0, 50)}... (AI Generated)

**Video Concept:**
Duration: ${request.duration} seconds
Format: ${styleInfo.label} (${styleInfo.aspectRatio})
Audio: ${request.includeAudio ? 'Included' : 'Silent'}

**Scene Breakdown:**
1. Opening Scene (0-${Math.floor(request.duration * 0.3)}s): Establishing shot introducing the main subject
2. Main Content (${Math.floor(request.duration * 0.3)}-${Math.floor(request.duration * 0.8)}s): Core visual narrative
3. Closing Scene (${Math.floor(request.duration * 0.8)}-${request.duration}s): Conclusion with smooth fade

**Visual Style:**
- High-quality cinematic presentation
- Smooth transitions and professional pacing
- Optimized for ${styleInfo.description.toLowerCase()}

**Technical Specifications:**
- Resolution: ${request.style === 'mobile' ? '1080x1920' : '1920x1080'}
- Frame Rate: 30fps
- Color Grading: Warm and inviting tones

${audioSection}

*This concept was generated using fallback mode due to API quota limits.*
        `.trim();
    }

    private extractTitle(concept: string): string {
        // Try to extract a title from the generated concept
        const lines = concept.split('\n');
        for (const line of lines) {
            if (line.toLowerCase().includes('title:') || line.toLowerCase().includes('video title:')) {
                return line.replace(/.*title:\s*/i, '').trim().substring(0, 60);
            }
        }
        return 'AI Generated Video';
    }

    async getJobStatus(jobId: string): Promise<VideoGenerationResponse> {
        // In a real implementation, this would:
        // 1. Query the database for job status
        // 2. Check with Google AI Studio API for current status
        // 3. Return actual video URL when completed

        try {
            console.log(`Checking status for job: ${jobId}`);

            // Simulate different job statuses based on job age
            const jobTimestamp = this.extractTimestampFromJobId(jobId);
            const currentTime = Date.now();
            const elapsedTime = currentTime - jobTimestamp;

            // Simulate progression: processing -> completed after 30 seconds
            if (elapsedTime < 30000) {
                return {
                    status: 'processing',
                    jobId,
                    videoUrl: undefined
                };
            } else {
                // Simulate successful completion with mock video URL
                return {
                    status: 'completed',
                    jobId,
                    videoUrl: `https://storage.googleapis.com/ai-studio-videos/${jobId}.mp4`
                };
            }
        } catch (error) {
            console.error('Error checking job status:', error);
            return {
                status: 'failed',
                jobId,
                error: 'Failed to check job status'
            };
        }
    }

    private extractTimestampFromJobId(jobId: string): number {
        // Extract timestamp from job ID format: job_timestamp_random
        const parts = jobId.split('_');
        if (parts.length >= 2) {
            return parseInt(parts[1]) || Date.now();
        }
        return Date.now();
    }

    async cancelJob(jobId: string): Promise<boolean> {
        // In a real implementation, this would cancel the job in Google AI Studio
        console.log(`Cancelling job: ${jobId}`);
        return true;
    }

    async getJobHistory(userId?: string): Promise<VideoGenerationResponse[]> {
        // In a real implementation, this would query the database for user's job history
        console.log(`Getting job history for user: ${userId || 'anonymous'}`);
        return [];
    }
}

export const videoService = new VideoGenerationService();