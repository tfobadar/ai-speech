import { useState, useCallback } from 'react';
import { VideoGenerationRequest, VideoGenerationResponse } from '@/types/video';

interface UseVideoGenerationReturn {
    generateVideo: (request: VideoGenerationRequest) => Promise<void>;
    checkJobStatus: (jobId: string) => Promise<VideoGenerationResponse | null>;
    isGenerating: boolean;
    result: VideoGenerationResponse | null;
    error: string;
    clearError: () => void;
    clearResult: () => void;
}

export function useVideoGeneration(): UseVideoGenerationReturn {
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<VideoGenerationResponse | null>(null);
    const [error, setError] = useState('');

    const generateVideo = useCallback(async (request: VideoGenerationRequest) => {
        setIsGenerating(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch('/api/generate-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            const data: VideoGenerationResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate video');
            }

            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const checkJobStatus = useCallback(async (jobId: string): Promise<VideoGenerationResponse | null> => {
        try {
            const response = await fetch(`/api/job-status/${jobId}`);
            const data: VideoGenerationResponse = await response.json();

            if (response.ok) {
                setResult(data);
                return data;
            } else {
                setError(data.error || 'Failed to check job status');
                return null;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to check job status');
            return null;
        }
    }, []);

    const clearError = useCallback(() => {
        setError('');
    }, []);

    const clearResult = useCallback(() => {
        setResult(null);
    }, []);

    return {
        generateVideo,
        checkJobStatus,
        isGenerating,
        result,
        error,
        clearError,
        clearResult,
    };
}
