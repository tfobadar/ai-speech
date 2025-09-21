'use client';

import { useState, useEffect } from 'react';

export default function TextToSpeechGenerator() {
    const [text, setText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<string>('');
    const [rate, setRate] = useState(1.0);
    const [pitch, setPitch] = useState(1.0);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);

    // Load available voices
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = speechSynthesis.getVoices();
            setVoices(availableVoices);

            // Set default voice (prefer English)
            const englishVoice = availableVoices.find(voice => voice.lang.startsWith('en'));
            if (englishVoice) {
                setSelectedVoice(englishVoice.name);
            }
        };

        loadVoices();

        // Some browsers load voices asynchronously
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    // File upload and text extraction (TXT files only for now)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingFile(true);

        try {
            let extractedText = '';

            if (file.type === 'text/plain') {
                extractedText = await file.text();
                setText(extractedText);
                setIsProcessingFile(false);
            } else if (file.type === 'application/pdf') {
                alert('PDF support is temporarily unavailable due to browser compatibility issues.\n\nPlease try:\n• Copy text from your PDF and paste it below\n• Convert PDF to text file (.txt)\n• Save PDF content as .txt file');
                setIsProcessingFile(false);
                return;
            } else {
                alert('Currently only TXT files are supported. For PDFs, please copy the text and paste it in the text area below.');
                setIsProcessingFile(false);
                return;
            }
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file: ' + (error as Error).message);
            setIsProcessingFile(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!text.trim()) {
            alert('Please enter some text or upload a file');
            return;
        }

        setIsGenerating(true);

        try {
            // Using browser Speech Synthesis API
            if ('speechSynthesis' in window) {
                // Create a simple audio URL for display purposes
                setAudioUrl('browser-synthesis');
                setIsGenerating(false);
            } else {
                alert('Speech synthesis not supported in this browser');
                setIsGenerating(false);
            }
        } catch (error) {
            console.error('Error generating speech:', error);
            alert('Error generating speech');
            setIsGenerating(false);
        }
    };

    const playAudio = () => {
        if ('speechSynthesis' in window && audioUrl) {
            const utterance = new SpeechSynthesisUtterance(text);

            // Set voice
            const voice = voices.find(v => v.name === selectedVoice);
            if (voice) {
                utterance.voice = voice;
            }

            // Set rate and pitch
            utterance.rate = rate;
            utterance.pitch = pitch;

            // Set event handlers
            utterance.onstart = () => {
                setIsPlaying(true);
            };

            utterance.onend = () => {
                setIsPlaying(false);
                setCurrentUtterance(null);
            };

            utterance.onerror = () => {
                setIsPlaying(false);
                setCurrentUtterance(null);
                alert('Error playing speech');
            };

            setCurrentUtterance(utterance);
            speechSynthesis.speak(utterance);
        } else {
            alert('Speech synthesis not supported in this browser');
        }
    };

    const stopAudio = () => {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            setIsPlaying(false);
            setCurrentUtterance(null);
        }
    };

    const downloadAudio = () => {
        alert('Download feature not available for browser-based TTS. Use the play button to listen to the speech.');
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-6">Text to Speech Generator</h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload Text File (.txt)
                            </label>
                            <input
                                type="file"
                                accept=".txt"
                                onChange={handleFileUpload}
                                disabled={isProcessingFile}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {isProcessingFile && (
                                <p className="text-blue-600 text-sm mt-2">Processing file...</p>
                            )}
                            <p className="text-gray-500 text-xs mt-1">
                                For PDF files: Please copy the text and paste it below
                            </p>
                        </div>

                        {/* Text Input */}
                        <div>
                            <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                                Text to Convert to Speech
                            </label>
                            <textarea
                                id="text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Enter your text here, upload a .txt file, or paste text from a PDF..."
                                className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Voice Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Voice
                            </label>
                            <select
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {voices.map((voice) => (
                                    <option key={voice.name} value={voice.name}>
                                        {voice.name} ({voice.lang}) {voice.default ? '(Default)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Speed Control */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Speed: {rate}x
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={rate}
                                onChange={(e) => setRate(parseFloat(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        {/* Pitch Control */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Pitch: {pitch}x
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={pitch}
                                onChange={(e) => setPitch(parseFloat(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isGenerating || isProcessingFile}
                            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                        >
                            {isGenerating ? 'Generating...' : 'Generate Speech'}
                        </button>
                    </form>
                </div>

                {/* Output Section */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">Generated Speech</h2>

                    {audioUrl ? (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
                                <p className="font-medium">✅ Speech Generated Successfully!</p>
                                <p className="text-sm mt-1">Ready to play with {voices.find(v => v.name === selectedVoice)?.name || 'default voice'}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex space-x-3">
                                    <button
                                        onClick={playAudio}
                                        disabled={isPlaying}
                                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        {isPlaying ? 'Playing...' : 'Play Audio'}
                                    </button>

                                    <button
                                        onClick={stopAudio}
                                        disabled={!isPlaying}
                                        className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 disabled:bg-red-400 transition-colors flex items-center justify-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                            <rect x="6" y="6" width="12" height="12" />
                                        </svg>
                                        Stop
                                    </button>
                                </div>

                                <button
                                    onClick={downloadAudio}
                                    className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Download Info
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-200 text-gray-600 p-8 rounded-lg text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            <p className="text-lg font-medium mb-2">No audio generated yet</p>
                            <p className="text-sm">Enter text or upload a file and click "Generate Speech" to start</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Features Section */}
            <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Available Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-700">Text File Upload (.txt)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-700">Voice Selection</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-700">Play/Stop Controls</span>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">📄 PDF Support Note:</h4>
                    <p className="text-sm text-yellow-700">
                        PDF file processing is temporarily unavailable due to browser compatibility issues.
                        For PDF content, please copy the text and paste it into the text area above.
                    </p>
                </div>
            </div>
        </div>
    );
}
