'use client';

import { useState, useEffect } from 'react';
import { VideoJob } from '@/types/video';

interface VideoGalleryProps {
    jobs: VideoJob[];
}

export default function VideoGallery({ jobs }: VideoGalleryProps) {
    const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');

    const filteredJobs = jobs.filter(job => {
        if (filter === 'all') return true;
        return job.status === filter;
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                );
            case 'processing':
                return (
                    <div className="w-5 h-5">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                    </div>
                );
            case 'failed':
                return (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    if (jobs.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Video Gallery</h3>
                <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p>No videos generated yet</p>
                    <p className="text-sm mt-1">Create your first video to see it here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Video Gallery</h3>

                {/* Filter Buttons */}
                <div className="flex space-x-2">
                    {(['all', 'completed', 'processing', 'failed'] as const).map(filterType => (
                        <button
                            key={filterType}
                            onClick={() => setFilter(filterType)}
                            className={`px-3 py-1 text-sm rounded-full transition-colors ${filter === filterType
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                            <span className="ml-1 opacity-75">
                                ({jobs.filter(job => filterType === 'all' || job.status === filterType).length})
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Video Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredJobs.map((job) => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                                {getStatusIcon(job.status)}
                                <span className={`text-sm font-medium ${job.status === 'completed' ? 'text-green-700' :
                                        job.status === 'processing' ? 'text-yellow-700' :
                                            job.status === 'failed' ? 'text-red-700' :
                                                'text-gray-700'
                                    }`}>
                                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                </span>
                            </div>

                            <div className="text-xs text-gray-500">
                                {job.style === 'mobile' ? '9:16' : '16:9'}
                            </div>
                        </div>

                        <h4 className="font-medium text-gray-800 mb-2 line-clamp-2">
                            {job.prompt.length > 80 ? `${job.prompt.substring(0, 80)}...` : job.prompt}
                        </h4>

                        <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                            <span>{job.duration}s</span>
                            <span>{job.includeAudio ? '🔊' : '🔇'}</span>
                        </div>

                        <div className="text-xs text-gray-500 mb-3">
                            Created: {new Date(job.createdAt).toLocaleDateString()}
                            {job.completedAt && (
                                <span className="block">
                                    Completed: {new Date(job.completedAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {job.videoUrl && (
                            <a
                                href={job.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center w-full justify-center bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-4a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                View Video
                            </a>
                        )}

                        {job.error && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                                {job.error}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filteredJobs.length === 0 && filter !== 'all' && (
                <div className="text-center py-8 text-gray-500">
                    <p>No {filter} videos found</p>
                </div>
            )}
        </div>
    );
}
