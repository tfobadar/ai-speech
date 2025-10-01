'use client';

import React, { useState, useRef } from 'react';
import { Upload, Copy, FileText, Image, AlertCircle, CheckCircle } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface ImageToTextGeneratorProps {
    className?: string;
}

export default function ImageToTextGenerator({ className = '' }: ImageToTextGeneratorProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [extractedText, setExtractedText] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [progress, setProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [copySuccess, setCopySuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
            if (!allowedTypes.includes(file.type)) {
                setError('Please select a valid image file (JPEG, PNG, GIF, WebP, or BMP)');
                return;
            }

            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                setError('File size must be less than 10MB');
                return;
            }

            setSelectedFile(file);
            setError('');
            setSuccess('');
            setExtractedText('');
            setProgress(0);

            // Create preview URL
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleExtractText = async () => {
        if (!selectedFile) {
            setError('Please select an image file first');
            return;
        }

        setIsProcessing(true);
        setError('');
        setSuccess('');
        setProgress(0);

        try {
            console.log('Starting OCR processing...');

            // Perform OCR using Tesseract.js in the browser
            const result = await Tesseract.recognize(
                selectedFile,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const progressPercent = Math.round(m.progress * 90); // Reserve 10% for server processing
                            setProgress(progressPercent);
                            console.log(`OCR Progress: ${progressPercent}%`);
                        }
                    }
                }
            );

            const extractedText = result.data.text.trim();

            if (!extractedText || extractedText.length === 0) {
                throw new Error('No readable text was detected in this image');
            }

            setProgress(95);

            // Send the extracted text to the server for processing and storage
            const response = await fetch('/api/process-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: extractedText,
                    fileName: selectedFile.name,
                    fileSize: selectedFile.size,
                    fileType: selectedFile.type
                }),
            });

            setProgress(100);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Failed to process image');
            }

            const data = await response.json();

            setExtractedText(data.text);
            setSuccess(`Successfully extracted ${data.characters} characters from the image!`);

            console.log('OCR completed successfully:', {
                characters: data.characters,
                method: data.method
            });

        } catch (error) {
            console.error('OCR Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to extract text from image';
            setError(errorMessage);
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const handleCopyText = async () => {
        if (!extractedText) return;

        try {
            await navigator.clipboard.writeText(extractedText);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
            console.error('Failed to copy text:', error);
            setError('Failed to copy text to clipboard');
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setExtractedText('');
        setError('');
        setSuccess('');
        setProgress(0);
        setCopySuccess(false);

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl('');
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={`max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm border ${className}`}>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Image className="w-6 h-6" />
                    Image to Text Generator
                </h2>
                <p className="text-gray-600">
                    Upload an image and extract text using OCR (Optical Character Recognition)
                </p>
            </div>

            {/* File Upload Section */}
            <div className="mb-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                        id="image-upload"
                    />
                    <label
                        htmlFor="image-upload"
                        className="cursor-pointer flex flex-col items-center gap-3"
                    >
                        <Upload className="w-12 h-12 text-gray-400" />
                        <div>
                            <p className="text-lg font-medium text-gray-700">
                                Click to upload an image
                            </p>
                            <p className="text-sm text-gray-500">
                                Supports JPEG, PNG, GIF, WebP, and BMP (max 10MB)
                            </p>
                        </div>
                    </label>
                </div>

                {selectedFile && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-blue-500" />
                                <div>
                                    <p className="font-medium text-gray-700">{selectedFile.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleReset}
                                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                )}

                {previewUrl && (
                    <div className="mt-4">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-w-full max-h-64 mx-auto rounded-lg shadow-sm border"
                        />
                    </div>
                )}
            </div>

            {/* Extract Button */}
            <div className="mb-6">
                <button
                    onClick={handleExtractText}
                    disabled={!selectedFile || isProcessing}
                    className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Processing Image with OCR...
                        </>
                    ) : (
                        <>
                            <FileText className="w-5 h-5" />
                            Extract Text from Image
                        </>
                    )}
                </button>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
                <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Processing...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-700 font-medium">Error</p>
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-green-700 font-medium">Success</p>
                        <p className="text-green-600 text-sm">{success}</p>
                    </div>
                </div>
            )}

            {/* Extracted Text Display */}
            {extractedText && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium text-gray-900">Extracted Text</h3>
                        <button
                            onClick={handleCopyText}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                            {copySuccess ? 'Copied!' : 'Copy Text'}
                        </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                            {extractedText}
                        </pre>
                    </div>
                    <div className="mt-3 text-sm text-gray-500">
                        {extractedText.length} characters extracted
                    </div>
                </div>
            )}
        </div>
    );
}
