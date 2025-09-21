'use client';

import { useState, useEffect } from 'react';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { VideoGenerationRequest } from '@/types/video';

export default function AdvancedVideoGenerator() {
    const [formData, setFormData] = useState<VideoGenerationRequest>({
        prompt: '',
        style: 'desktop',
        duration: 30,
        includeAudio: true
    });

    const { generateVideo, checkJobStatus, isGenerating, result, error, clearError } = useVideoGeneration();

    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Start polling if video is processing
        if (result?.status === 'processing' && result.jobId) {
            const interval = setInterval(async () => {
                const updatedResult = await checkJobStatus(result.jobId);
                if (updatedResult && (updatedResult.status === 'completed' || updatedResult.status === 'failed')) {
                    clearInterval(interval);
                    setPollingInterval(null);
                }
            }, 3000);

            setPollingInterval(interval);
        }

        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [result?.status, result?.jobId, checkJobStatus]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        await generateVideo(formData);
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

    const presetPrompts = [
        "A serene sunset over a mountain landscape with birds flying",
        "A bustling city street at night with neon lights",
        "A peaceful ocean wave gently washing onto a sandy beach",
        "A cozy fireplace in a rustic cabin during winter",
        "A field of colorful flowers swaying in the breeze"
    ];

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="grid md:grid-cols-2 gap-8">
                {/* Form Section */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Create Your Video</h2>

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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                placeholder="Describe the video you want to generate..."
                                value={formData.prompt}
                                onChange={handleInputChange}
                                required
                            />

                            {/* Preset Prompts */}
                            <div className="mt-2">
                                <p className="text-xs text-gray-500 mb-2">Quick prompts:</p>
                                <div className="flex flex-wrap gap-1">
                                    {presetPrompts.map((preset, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, prompt: preset }))}
                                            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                                        >
                                            {preset.substring(0, 30)}...
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Style and Duration Row */}
                        <div className="grid grid-cols-2 gap-4">
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
                                    <option value="desktop">Desktop (16:9)</option>
                                    <option value="mobile">Mobile (9:16)</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                                    Duration (sec) *
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
                            </div>
                        </div>

                        {/* Duration Presets */}
                        <div>
                            <p className="text-sm text-gray-600 mb-2">Quick duration:</p>
                            <div className="flex gap-2">
                                {[15, 30, 60, 120].map(duration => (
                                    <button
                                        key={duration}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, duration }))}
                                        className={`px-3 py-1 text-sm rounded transition-colors ${formData.duration === duration
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200'
                                            }`}
                                    >
                                        {duration}s
                                    </button>
                                ))}
                            </div>
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
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                            {isGenerating ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Generating Video...
                                </div>
                            ) : (
                                'Generate Video'
                            )}
                        </button>
                    </form>
                </div>

                {/* Results Section */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Generation Results</h2>

                    {/* Error Display */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                            <h3 className="font-medium flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                Error
                            </h3>
                            <p className="mt-1">{error}</p>
                        </div>
                    )}

                    {/* Result Display */}
                    {result ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-md">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-medium text-gray-800">Job Status</h3>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${result.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        result.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                            result.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <p><strong>Job ID:</strong> <code className="bg-gray-200 px-1 rounded">{result.jobId}</code></p>

                                    {result.status === 'processing' && (
                                        <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                            <span className="text-gray-600">Processing your video...</span>
                                        </div>
                                    )}

                                    {result.status === 'completed' && (
                                        <div className="mt-4 space-y-4">
                                            {result.videoUrl ? (
                                                <div className="p-3 bg-green-50 rounded border border-green-200">
                                                    <p className="font-medium text-green-700 mb-2">✅ Video ready!</p>
                                                    <a
                                                        href={result.videoUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                        Download Video
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                                    <p className="font-medium text-blue-700 mb-2">✅ Video concept generated!</p>
                                                    <p className="text-blue-600 text-sm">
                                                        Video concept and production plan completed.
                                                        {result.metadata?.fallback && " (Generated using fallback mode due to API limits)"}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Display metadata/concept details */}
                                            {result.metadata && (
                                                <div className="p-4 bg-white rounded border border-gray-200">
                                                    <h4 className="font-medium text-gray-800 mb-3">Video Details</h4>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        {result.metadata.title && (
                                                            <div>
                                                                <span className="font-medium text-gray-600">Title:</span>
                                                                <p className="text-gray-800">{result.metadata.title}</p>
                                                            </div>
                                                        )}
                                                        {result.metadata.duration && (
                                                            <div>
                                                                <span className="font-medium text-gray-600">Duration:</span>
                                                                <p className="text-gray-800">{result.metadata.duration}s</p>
                                                            </div>
                                                        )}
                                                        {result.metadata.style && (
                                                            <div>
                                                                <span className="font-medium text-gray-600">Style:</span>
                                                                <p className="text-gray-800">{result.metadata.style === 'mobile' ? 'Mobile (9:16)' : 'Desktop (16:9)'}</p>
                                                            </div>
                                                        )}
                                                        {result.metadata.includeAudio !== undefined && (
                                                            <div>
                                                                <span className="font-medium text-gray-600">Audio:</span>
                                                                <p className="text-gray-800">{result.metadata.includeAudio ? 'Included' : 'Silent'}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {result.metadata.concept && (
                                                        <div className="mt-4">
                                                            <span className="font-medium text-gray-600">Video Concept:</span>
                                                            <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto whitespace-pre-wrap">
                                                                {result.metadata.concept}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {result.error && (
                                        <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                                            <p className="text-red-600">
                                                <strong>Error:</strong> {result.error}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <p>No video generation in progress</p>
                            <p className="text-sm mt-1">Fill out the form and click "Generate Video" to get started</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
