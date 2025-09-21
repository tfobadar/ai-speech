'use client';

import { useState } from 'react';
import { VideoGenerationRequest, VideoGenerationResponse } from '@/types/video';

export default function VideoGenerator() {
    const [formData, setFormData] = useState<VideoGenerationRequest>({
        prompt: '',
        style: 'desktop',
        duration: 30,
        includeAudio: true
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<VideoGenerationResponse | null>(null);
    const [error, setError] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch('/api/generate-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data: VideoGenerationResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate video');
            }

            setResult(data);

            // If the video is still processing, poll for updates
            if (data.status === 'processing') {
                pollJobStatus(data.jobId);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsGenerating(false);
        }
    };

    const pollJobStatus = async (jobId: string) => {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/job-status/${jobId}`);
                const data: VideoGenerationResponse = await response.json();

                setResult(data);

                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(pollInterval);
                }
            } catch (err) {
                console.error('Error polling job status:', err);
                clearInterval(pollInterval);
            }
        }, 3000); // Poll every 3 seconds
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
                type === 'number' ? parseInt(value) : value
        }));
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">AI Video Generator</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Prompt Input */}
                <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                        Video Description *
                    </label>
                    <textarea
                        id="prompt"
                        name="prompt"
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Describe the video you want to generate..."
                        value={formData.prompt}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                {/* Style Selection */}
                <div>
                    <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
                        Video Style *
                    </label>
                    <select
                        id="style"
                        name="style"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.style}
                        onChange={handleInputChange}
                        required
                    >
                        <option value="desktop">Desktop (16:9 - Landscape)</option>
                        <option value="mobile">Mobile (9:16 - Portrait)</option>
                    </select>
                </div>

                {/* Duration Input */}
                <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (seconds) *
                    </label>
                    <input
                        type="number"
                        id="duration"
                        name="duration"
                        min="5"
                        max="300"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.duration}
                        onChange={handleInputChange}
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Between 5 and 300 seconds</p>
                </div>

                {/* Audio Option */}
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="includeAudio"
                        name="includeAudio"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={formData.includeAudio}
                        onChange={handleInputChange}
                    />
                    <label htmlFor="includeAudio" className="ml-2 block text-sm text-gray-700">
                        Include audio (background music and sound effects)
                    </label>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isGenerating || !formData.prompt.trim()}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isGenerating ? 'Generating Video...' : 'Generate Video'}
                </button>
            </form>

            {/* Error Display */}
            {error && (
                <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                    <h3 className="font-medium">Error:</h3>
                    <p>{error}</p>
                </div>
            )}

            {/* Result Display */}
            {result && (
                <div className="mt-6 p-4 bg-gray-50 rounded-md">
                    <h3 className="font-medium text-gray-800 mb-2">Generation Status</h3>

                    <div className="space-y-2">
                        <p><strong>Job ID:</strong> {result.jobId}</p>
                        <p><strong>Status:</strong>
                            <span className={`ml-2 px-2 py-1 rounded text-sm ${result.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    result.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                        result.status === 'failed' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                }`}>
                                {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                            </span>
                        </p>

                        {result.status === 'processing' && (
                            <div className="flex items-center mt-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                <span className="text-sm text-gray-600">Processing your video...</span>
                            </div>
                        )}

                        {result.videoUrl && (
                            <div className="mt-4">
                                <p className="font-medium text-green-700">Video ready!</p>
                                <a
                                    href={result.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                                >
                                    Download Video
                                </a>
                            </div>
                        )}

                        {result.error && (
                            <p className="text-red-600 mt-2">
                                <strong>Error:</strong> {result.error}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
