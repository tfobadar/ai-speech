import { useState, useCallback } from 'react';
import { TextToSpeechRequest, TextToSpeechResponse } from '@/lib/text-to-speech-service';

export function useTextToSpeech() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<TextToSpeechResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const generateSpeech = useCallback(async (request: TextToSpeechRequest) => {
        setIsGenerating(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate speech');
            }

            setResult(data);
            return data;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate speech';
            setError(errorMessage);
            throw err;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const reset = useCallback(() => {
        setResult(null);
        setError(null);
        setIsGenerating(false);
    }, []);

    return {
        generateSpeech,
        isGenerating,
        result,
        error,
        reset
    };
}
