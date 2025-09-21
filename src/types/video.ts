export interface VideoGenerationRequest {
    prompt: string;
    style: 'mobile' | 'desktop';
    duration: number; // in seconds
    includeAudio: boolean;
}

export interface VideoGenerationResponse {
    videoUrl?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    jobId: string;
    error?: string;
    metadata?: {
        title?: string;
        duration?: number;
        style?: string;
        includeAudio?: boolean;
        concept?: string;
        generatedAt?: string;
        fallback?: boolean;
    };
}

export interface VideoJob {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    prompt: string;
    style: 'mobile' | 'desktop';
    duration: number;
    includeAudio: boolean;
    videoUrl?: string;
    error?: string;
    createdAt: Date;
    completedAt?: Date;
}
