'use client';

import React, { useState, useRef } from 'react';
import { Upload, Copy, FileText, AlertCircle, CheckCircle, File } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface ImageToTextGeneratorProps {
    readonly className?: string;
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
            // Validate file type - accept images and PDFs
            const allowedTypes = [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
                'application/pdf'
            ];
            if (!allowedTypes.includes(file.type)) {
                setError('Please select a valid image file (JPEG, PNG, GIF, WebP, BMP) or PDF file');
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

            // Create preview URL for images only
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
            } else {
                setPreviewUrl(''); // No preview for PDFs
            }
        }
    };

    const handleExtractText = async () => {
        if (!selectedFile) {
            setError('Please select a file first');
            return;
        }

        setIsProcessing(true);
        setError('');
        setSuccess('');
        setProgress(0);

        try {
            console.log('Starting text extraction processing...');

            let extractedText = '';

            if (selectedFile.type === 'application/pdf') {
                // Handle PDF files
                setProgress(10);
                extractedText = await processPDF(selectedFile);
            } else {
                // Handle image files
                setProgress(10);
                extractedText = await processImage(selectedFile);
            }

            if (!extractedText || extractedText.length === 0) {
                throw new Error('No readable text was detected in this file');
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
                throw new Error(errorData.details || errorData.error || 'Failed to process file');
            }

            const data = await response.json();

            setExtractedText(data.text);
            setSuccess(`Successfully extracted ${data.characters} characters from the ${selectedFile.type === 'application/pdf' ? 'PDF' : 'image'}!`);

            console.log('Text extraction completed successfully:', {
                characters: data.characters,
                method: data.method
            });

        } catch (error) {
            console.error('Text extraction Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to extract text from file';
            setError(errorMessage);
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const processImage = async (file: File): Promise<string> => {
        // Perform OCR using Tesseract.js in the browser
        const result = await Tesseract.recognize(
            file,
            'eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const progressPercent = Math.round(m.progress * 80) + 10; // 10-90%
                        setProgress(progressPercent);
                        console.log(`OCR Progress: ${progressPercent}%`);
                    }
                }
            }
        );

        return result.data.text.trim();
    };

    const processPDF = async (file: File): Promise<string> => {
        try {
            // Import PDF.js worker
            const pdfjsLib = await import('pdfjs-dist');

            // Set the worker source to use the local worker file
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
            }

            console.log('PDF.js worker configured, loading document...');

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let allText = '';
            const numPages = pdf.numPages;
            console.log(`Processing PDF with ${numPages} pages...`);

            for (let i = 1; i <= numPages; i++) {
                setProgress(10 + ((i - 1) / numPages) * 60); // 10-70%

                const page = await pdf.getPage(i);

                // Try text extraction first
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ')
                    .trim();

                if (pageText.length > 0) {
                    // If text extraction works, use it
                    allText += pageText + '\n\n';
                    console.log(`Page ${i}: Extracted ${pageText.length} characters via text parsing`);
                } else {
                    // If no text found, use OCR on the page
                    console.log(`Page ${i}: No text found, using OCR...`);

                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({
                        canvasContext: context!,
                        viewport: viewport,
                        canvas: canvas
                    }).promise;

                    // Convert canvas to image and run OCR
                    const imageDataURL = canvas.toDataURL();
                    const ocrResult = await Tesseract.recognize(
                        imageDataURL,
                        'eng',
                        {
                            logger: m => {
                                if (m.status === 'recognizing text') {
                                    const baseProgress = 10 + ((i - 1) / numPages) * 60;
                                    const pageProgress = (m.progress * 60) / numPages;
                                    setProgress(Math.round(baseProgress + pageProgress));
                                }
                            }
                        }
                    );

                    const ocrText = ocrResult.data.text.trim();
                    if (ocrText.length > 0) {
                        allText += ocrText + '\n\n';
                        console.log(`Page ${i}: Extracted ${ocrText.length} characters via OCR`);
                    }
                }
            }

            setProgress(80);
            return allText.trim();
        } catch (error) {
            console.error('PDF processing error:', error);
            throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                    <FileText className="w-6 h-6" />
                    Document to Text Generator
                </h2>
                <p className="text-gray-600">
                    Upload an image or PDF and extract text using OCR (Optical Character Recognition)
                </p>
            </div>

            {/* File Upload Section */}
            <div className="mb-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,.pdf"
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
                                Click to upload a file
                            </p>
                            <p className="text-sm text-gray-500">
                                Supports images (JPEG, PNG, GIF, WebP, BMP) and PDF files (max 10MB)
                            </p>
                        </div>
                    </label>
                </div>

                {selectedFile && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {selectedFile.type === 'application/pdf' ? (
                                    <File className="w-5 h-5 text-red-500" />
                                ) : (
                                    <FileText className="w-5 h-5 text-blue-500" />
                                )}
                                <div>
                                    <p className="font-medium text-gray-700">{selectedFile.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type === 'application/pdf' ? 'PDF' : 'Image'}
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
                            {selectedFile?.type === 'application/pdf' ? 'Processing PDF with OCR...' : 'Processing Image with OCR...'}
                        </>
                    ) : (
                        <>
                            <FileText className="w-5 h-5" />
                            Extract Text from File
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
