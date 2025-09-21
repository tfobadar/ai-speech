'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { TTSDataService } from '@/lib/tts-data-service';

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
    const [summary, setSummary] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isPlayingSummary, setIsPlayingSummary] = useState(false);
    const [chatHistory, setChatHistory] = useState<Array<{ question: string, answer: string, timestamp: Date }>>([]);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [isPlayingAnswer, setIsPlayingAnswer] = useState(false);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
    const [currentDocumentId, setCurrentDocumentId] = useState<number | null>(null);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [isSavingToDb, setIsSavingToDb] = useState(false);

    const { user, isLoaded } = useUser();

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

    // Auto-generate suggested questions when text is loaded
    useEffect(() => {
        if (text.trim() && text.length >= 100) {
            // Clear previous questions
            setSuggestedQuestions([]);

            // Add a small delay to avoid too many API calls during typing
            const timeoutId = setTimeout(async () => {
                try {
                    const response = await fetch('/api/generate-questions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ text }),
                    });

                    const result = await response.json();

                    if (response.ok && result.questions) {
                        setSuggestedQuestions(result.questions);

                        // Save suggested questions to database if document exists
                        if (currentDocumentId && user?.id) {
                            try {
                                await TTSDataService.saveSuggestedQuestions(currentDocumentId, result.questions);
                                console.log('Auto-generated questions saved to database');
                            } catch (error) {
                                console.error('Error saving auto-generated questions to database:', error);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error auto-generating questions:', error);
                    // Silently fail for auto-generation
                }
            }, 3000);

            return () => clearTimeout(timeoutId);
        } else {
            setSuggestedQuestions([]);
        }
    }, [text]);

    // Handle manual text input
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
    };

    // Save manually entered text to database (with debounce)
    useEffect(() => {
        if (text.trim() && text.length >= 50 && !currentDocumentId && user?.id && isLoaded) {
            // Only save if this isn't from a file upload (no currentDocumentId yet)
            const timeoutId = setTimeout(async () => {
                try {
                    await saveDocumentToDb(text, undefined, 'manual_text');
                } catch (error) {
                    console.error('Error saving manual text:', error);
                }
            }, 5000); // 5 second delay for manual typing

            return () => clearTimeout(timeoutId);
        }
    }, [text, user?.id, isLoaded, currentDocumentId]);

    // Save document to database
    const saveDocumentToDb = async (content: string, fileName?: string, documentType?: string) => {
        if (!user?.id || !isLoaded) {
            console.log('User not loaded or not authenticated, skipping database save');
            return null;
        }

        setIsSavingToDb(true);
        try {
            const documentData = {
                userId: user.id,
                content: content,
                fileName: fileName,
                documentType: documentType || 'text',
                title: fileName ? `${fileName.split('.')[0]}` : `Document - ${new Date().toLocaleDateString()}`
            };

            const document = await TTSDataService.saveDocument(documentData);
            setCurrentDocumentId(document.id);

            // Create a new chat session for this document
            const session = await TTSDataService.createChatSession(user.id, document.id);
            setCurrentSessionId(session.id);

            console.log('Document saved to database:', document.id);
            return document;
        } catch (error) {
            console.error('Error saving document to database:', error);
            return null;
        } finally {
            setIsSavingToDb(false);
        }
    };

    // Extract text from PDF using server-side API
    const extractTextFromPDF = async (file: File): Promise<string> => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/process-pdf', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                // Show helpful error message for different scenarios
                if (result.fallback) {
                    alert(`PDF Processing Issue:\n\n${result.details}\n\nFor now, please:\n1. Open your PDF file\n2. Copy the text (Ctrl+A, Ctrl+C)\n3. Paste it into the text area below`);
                    throw new Error('PDF processing temporarily unavailable - please copy and paste text manually');
                } else {
                    throw new Error(result.details || result.error || 'Failed to process PDF on server');
                }
            }

            if (result.error) {
                throw new Error(result.error);
            }

            console.log(`PDF processed: ${result.pages} pages, ${result.characters} characters`);
            return result.text;
        } catch (error) {
            console.error('PDF processing error:', error);
            throw new Error('Failed to process PDF file. Please try converting it to text format or copy the content manually.');
        }
    };

    // Extract text from DOC/DOCX using server-side API
    const extractTextFromDOC = async (file: File): Promise<string> => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/process-doc', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to process DOC/DOCX on server');
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            console.log(`DOC processed: ${result.characters} characters`);
            return result.text;
        } catch (error) {
            console.error('DOC processing error:', error);
            throw new Error('Failed to process DOC/DOCX file. Please try converting it to text format or copy the content manually.');
        }
    };

    // File upload and text extraction with support for multiple formats
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingFile(true);

        try {
            let extractedText = '';

            if (file.type === 'text/plain') {
                extractedText = await file.text();
            } else if (file.type === 'application/pdf') {
                extractedText = await extractTextFromPDF(file);
            } else if (
                file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                file.type === 'application/msword' ||
                file.name.endsWith('.docx') ||
                file.name.endsWith('.doc')
            ) {
                extractedText = await extractTextFromDOC(file);
            } else {
                throw new Error(`Unsupported file type: ${file.type}. Please upload TXT, PDF, DOC, or DOCX files.`);
            }

            if (!extractedText.trim()) {
                throw new Error('No text found in the file. The file might be empty, image-based, or encrypted.');
            }

            setText(extractedText);

            // Save document to database
            await saveDocumentToDb(extractedText, file.name, file.type);

            alert(`Successfully extracted ${extractedText.length} characters from ${file.name}`);
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file: ' + (error as Error).message);
        } finally {
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

    const generateSummary = async () => {
        if (!text.trim()) {
            alert('Please enter some text first');
            return;
        }

        if (text.length < 50) {
            alert('Text must be at least 50 characters long to summarize');
            return;
        }

        setIsSummarizing(true);

        try {
            const response = await fetch('/api/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate summary');
            }

            setSummary(result.summary);

            // Save summary to database if document exists
            if (currentDocumentId && user?.id) {
                try {
                    await TTSDataService.updateDocument(currentDocumentId, { summary: result.summary });
                    console.log('Summary saved to database');
                } catch (error) {
                    console.error('Error saving summary to database:', error);
                }
            }

            console.log(`Summary generated: ${result.summaryLength} characters from ${result.originalLength} characters`);
        } catch (error) {
            console.error('Error generating summary:', error);
            alert('Error generating summary: ' + (error as Error).message);
        } finally {
            setIsSummarizing(false);
        }
    };

    const playSummary = () => {
        if (!summary.trim()) {
            alert('Please generate a summary first');
            return;
        }

        if ('speechSynthesis' in window) {
            // Stop any current speech
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(summary);

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
                setIsPlayingSummary(true);
            };

            utterance.onend = () => {
                setIsPlayingSummary(false);
                setCurrentUtterance(null);
            };

            utterance.onerror = () => {
                setIsPlayingSummary(false);
                setCurrentUtterance(null);
                alert('Error playing summary');
            };

            setCurrentUtterance(utterance);
            speechSynthesis.speak(utterance);
        } else {
            alert('Speech synthesis not supported in this browser');
        }
    };

    const stopSummary = () => {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            setIsPlayingSummary(false);
            setCurrentUtterance(null);
        }
    };

    const generateSuggestedQuestions = async () => {
        if (!text.trim()) {
            alert('Please upload a document or enter text first');
            return;
        }

        if (text.length < 100) {
            alert('Text must be at least 100 characters long to generate meaningful questions');
            return;
        }

        setIsGeneratingQuestions(true);

        try {
            const response = await fetch('/api/generate-questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate questions');
            }

            setSuggestedQuestions(result.questions);

            // Save suggested questions to database if document exists
            if (currentDocumentId && user?.id) {
                try {
                    await TTSDataService.saveSuggestedQuestions(currentDocumentId, result.questions);
                    console.log('Suggested questions saved to database');
                } catch (error) {
                    console.error('Error saving suggested questions to database:', error);
                }
            }

            console.log(`Generated ${result.questionCount} questions for document of ${result.documentLength} characters`);
        } catch (error) {
            console.error('Error generating questions:', error);
            alert('Error generating questions: ' + (error as Error).message);
        } finally {
            setIsGeneratingQuestions(false);
        }
    };

    const selectQuestion = (question: string) => {
        setCurrentQuestion(question);
    };

    const askQuestion = async () => {
        if (!currentQuestion.trim()) {
            alert('Please enter a question');
            return;
        }

        if (!text.trim()) {
            alert('Please upload a document or enter text first to ask questions about it');
            return;
        }

        setIsAsking(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: currentQuestion,
                    context: text
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to get answer');
            }

            // Add to chat history
            const newChat = {
                question: currentQuestion,
                answer: result.answer,
                timestamp: new Date()
            };

            setChatHistory(prev => [...prev, newChat]);

            // Save chat message to database if session exists
            if (currentSessionId && user?.id) {
                try {
                    const isSuggestedQuestion = suggestedQuestions.includes(currentQuestion);
                    await TTSDataService.saveChatMessage(currentSessionId, {
                        question: currentQuestion,
                        answer: result.answer,
                        suggestedQuestion: isSuggestedQuestion
                    });
                    console.log('Chat message saved to database');
                } catch (error) {
                    console.error('Error saving chat message to database:', error);
                }
            }

            setCurrentQuestion('');

            console.log(`Question answered: ${result.answer.length} characters`);
        } catch (error) {
            console.error('Error asking question:', error);
            alert('Error getting answer: ' + (error as Error).message);
        } finally {
            setIsAsking(false);
        }
    };

    const playAnswer = (answer: string) => {
        if ('speechSynthesis' in window) {
            // Stop any current speech
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(answer);

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
                setIsPlayingAnswer(true);
            };

            utterance.onend = () => {
                setIsPlayingAnswer(false);
                setCurrentUtterance(null);
            };

            utterance.onerror = () => {
                setIsPlayingAnswer(false);
                setCurrentUtterance(null);
                alert('Error playing answer');
            };

            setCurrentUtterance(utterance);
            speechSynthesis.speak(utterance);
        } else {
            alert('Speech synthesis not supported in this browser');
        }
    };

    const stopAnswer = () => {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            setIsPlayingAnswer(false);
            setCurrentUtterance(null);
        }
    };

    const clearChatHistory = () => {
        setChatHistory([]);
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Navigation */}
            <div className="mb-6 bg-white rounded-xl shadow-lg p-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-bold text-gray-800">🎤 AI Text-to-Speech</h1>
                        {user && (
                            <span className="text-sm text-gray-600">
                                👋 Hello, {user.firstName || user.emailAddresses[0]?.emailAddress}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-4">
                        <a
                            href="/documents"
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            📚 My Documents
                        </a>
                        <a
                            href="/dashboard"
                            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                            🏠 Dashboard
                        </a>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-6">📄 Text to Speech Generator</h1>

                    {/* Database Saving Indicator */}
                    {isSavingToDb && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                <p className="text-blue-800 text-sm">💾 Saving to your account...</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                📎 Upload Document
                            </label>
                            <input
                                type="file"
                                accept=".txt,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={handleFileUpload}
                                disabled={isProcessingFile}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {isProcessingFile && (
                                <div className="flex items-center mt-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                    <p className="text-blue-600 text-sm">Processing file, please wait...</p>
                                </div>
                            )}
                            <div className="mt-2 text-xs text-gray-500">
                                <p>✅ <strong>TXT files:</strong> Work perfectly</p>
                                <p>⚠️ <strong>PDF/DOC files:</strong> May need manual copy-paste if processing fails</p>
                                <p>📝 Maximum file size: 10MB recommended</p>
                            </div>
                        </div>

                        {/* Text Input */}
                        <div>
                            <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                                ✏️ Text to Convert to Speech
                            </label>
                            <textarea
                                id="text"
                                value={text}
                                onChange={handleTextChange}
                                placeholder="Enter your text here, or upload a document (TXT, PDF, DOC, DOCX)..."
                                className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                            <div className="mt-1 text-xs text-gray-500">
                                Characters: {text.length}
                            </div>

                            {/* Help Section for PDF Issues */}
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="text-xs text-blue-800">
                                    <strong>💡 Having trouble with PDF files?</strong>
                                    <br />
                                    1. Open your PDF file on your computer
                                    <br />
                                    2. Select all text (Ctrl+A or Cmd+A)
                                    <br />
                                    3. Copy the text (Ctrl+C or Cmd+C)
                                    <br />
                                    4. Paste it in the text area above (Ctrl+V or Cmd+V)
                                </div>
                            </div>
                        </div>

                        {/* Voice Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                🎤 Select Voice
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
                                ⚡ Speed: {rate}x
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={rate}
                                onChange={(e) => setRate(parseFloat(e.target.value))}
                                className="w-full accent-blue-600"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Slow (0.5x)</span>
                                <span>Normal (1x)</span>
                                <span>Fast (2x)</span>
                            </div>
                        </div>

                        {/* Pitch Control */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                🎵 Pitch: {pitch}x
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={pitch}
                                onChange={(e) => setPitch(parseFloat(e.target.value))}
                                className="w-full accent-blue-600"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Low (0.5x)</span>
                                <span>Normal (1x)</span>
                                <span>High (2x)</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isGenerating || isProcessingFile}
                            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12h6m-6 0a3 3 0 01-3-3V7a3 3 0 013-3h6a3 3 0 013 3v2a3 3 0 01-3 3m-6 0a3 3 0 00-3 3v2a3 3 0 003 3h6a3 3 0 003-3v-2a3 3 0 00-3-3" />
                                    </svg>
                                    Generate Speech
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Output Section */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">🔊 Generated Speech</h2>

                    {audioUrl ? (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
                                <p className="font-medium">✅ Speech Generated Successfully!</p>
                                <p className="text-sm mt-1">Ready to play with {voices.find(v => v.name === selectedVoice)?.name || 'default voice'}</p>
                                <p className="text-xs mt-1">Text length: {text.length} characters</p>
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

                            {/* Summary Section */}
                            <div className="mt-6 p-4 border-t border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    📝 Smart Summary
                                </h3>

                                <div className="space-y-3">
                                    <button
                                        onClick={generateSummary}
                                        disabled={isSummarizing || !text.trim()}
                                        className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-purple-400 transition-colors flex items-center justify-center"
                                    >
                                        {isSummarizing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Summarizing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Generate Summary
                                            </>
                                        )}
                                    </button>

                                    {summary && (
                                        <>
                                            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                                                <p className="text-sm text-purple-800 font-medium mb-2">Summary:</p>
                                                <p className="text-sm text-purple-700">{summary}</p>
                                                <p className="text-xs text-purple-600 mt-2">Length: {summary.length} characters</p>
                                            </div>

                                            <div className="flex space-x-3">
                                                <button
                                                    onClick={playSummary}
                                                    disabled={isPlayingSummary}
                                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center justify-center"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                    {isPlayingSummary ? 'Playing Summary...' : 'Play Summary'}
                                                </button>

                                                <button
                                                    onClick={stopSummary}
                                                    disabled={!isPlayingSummary}
                                                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:bg-red-400 transition-colors flex items-center justify-center"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                                        <rect x="6" y="6" width="12" height="12" />
                                                    </svg>
                                                    Stop
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-200 text-gray-600 p-8 rounded-lg text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            <p className="text-lg font-medium mb-2">No audio generated yet</p>
                            <p className="text-sm">Upload a document or enter text and click "Generate Speech" to start</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Section */}
            <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    💬 Ask Questions About Your Document
                </h3>

                {text.trim() ? (
                    <div className="space-y-4">
                        {/* Question Input */}
                        <div className="flex space-x-3">
                            <input
                                type="text"
                                value={currentQuestion}
                                onChange={(e) => setCurrentQuestion(e.target.value)}
                                placeholder="Ask any question about your document..."
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onKeyPress={(e) => e.key === 'Enter' && !isAsking && askQuestion()}
                                disabled={isAsking}
                            />
                            <button
                                onClick={askQuestion}
                                disabled={isAsking || !currentQuestion.trim()}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center"
                            >
                                {isAsking ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Asking...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Ask
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Suggested Questions */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-800 flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    💡 Suggested Questions
                                </h4>
                                <button
                                    onClick={generateSuggestedQuestions}
                                    disabled={isGeneratingQuestions || !text.trim() || text.length < 100}
                                    className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:bg-purple-400 transition-colors flex items-center"
                                >
                                    {isGeneratingQuestions ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Refresh
                                        </>
                                    )}
                                </button>
                            </div>

                            {isGeneratingQuestions && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                                        <p className="text-purple-800 text-sm">Analyzing your document to generate relevant questions...</p>
                                    </div>
                                </div>
                            )}

                            {suggestedQuestions.length > 0 && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-purple-800 mb-3">
                                        Click any question to ask it about your document:
                                    </p>
                                    <div className="space-y-2">
                                        {suggestedQuestions.map((question, index) => (
                                            <button
                                                key={index}
                                                onClick={() => selectQuestion(question)}
                                                className="w-full text-left p-3 bg-white border border-purple-300 rounded-lg hover:bg-purple-100 hover:border-purple-400 transition-colors text-sm text-gray-700 hover:text-purple-800"
                                            >
                                                <span className="font-medium text-purple-600 mr-2">Q{index + 1}:</span>
                                                {question}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-purple-600 mt-3">
                                        💡 {suggestedQuestions.length} questions generated based on your document content
                                    </p>
                                </div>
                            )}

                            {!isGeneratingQuestions && suggestedQuestions.length === 0 && text.length >= 100 && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    <p className="text-sm text-gray-600">Click "Refresh" to generate suggested questions for your document</p>
                                </div>
                            )}
                        </div>

                        {/* Chat History */}
                        {chatHistory.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-gray-800">Conversation History</h4>
                                    <button
                                        onClick={clearChatHistory}
                                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Clear History
                                    </button>
                                </div>

                                <div className="max-h-96 overflow-y-auto space-y-3 border border-gray-200 rounded-lg p-4">
                                    {chatHistory.map((chat, index) => (
                                        <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                                            {/* Question */}
                                            <div className="mb-2">
                                                <div className="flex items-start space-x-2">
                                                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Q</div>
                                                    <p className="text-sm text-gray-700 flex-1">{chat.question}</p>
                                                </div>
                                            </div>

                                            {/* Answer */}
                                            <div className="mb-2">
                                                <div className="flex items-start space-x-2">
                                                    <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">A</div>
                                                    <p className="text-sm text-gray-600 flex-1">{chat.answer}</p>
                                                </div>
                                            </div>

                                            {/* Answer Controls */}
                                            <div className="flex items-center space-x-2 ml-6">
                                                <button
                                                    onClick={() => playAnswer(chat.answer)}
                                                    disabled={isPlayingAnswer}
                                                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center"
                                                >
                                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                    {isPlayingAnswer ? 'Playing...' : 'Play Answer'}
                                                </button>

                                                {isPlayingAnswer && (
                                                    <button
                                                        onClick={stopAnswer}
                                                        className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors flex items-center"
                                                    >
                                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                                            <rect x="6" y="6" width="12" height="12" />
                                                        </svg>
                                                        Stop
                                                    </button>
                                                )}

                                                <span className="text-xs text-gray-400">
                                                    {chat.timestamp.toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {chatHistory.length === 0 && suggestedQuestions.length === 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>💡 How to get started:</strong>
                                </p>
                                <ul className="text-xs text-blue-700 mt-2 space-y-1">
                                    <li>• <strong>Wait for suggested questions</strong> to appear above (auto-generated)</li>
                                    <li>• Or type your own questions like "What is the main topic?"</li>
                                    <li>• Try "Can you explain the key points?"</li>
                                    <li>• Ask "What are the conclusions mentioned?"</li>
                                    <li>• Inquire about specific topics mentioned in the text</li>
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-gray-50 border border-gray-200 text-gray-600 p-6 rounded-lg text-center">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="font-medium mb-1">Upload a document first</p>
                        <p className="text-sm">Add some text or upload a document to start asking questions about it</p>
                    </div>
                )}
            </div>

            {/* Features Section */}
            <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">🚀 Supported Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-700">📄 PDF Files</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-700">📝 DOC/DOCX Files</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-700">🎤 Voice Selection</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-700">⏯️ Play/Stop Controls</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-700">💬 AI Chat</span>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">💡 Pro Tips:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• For best results, use clear, well-formatted documents</li>
                        <li>• PDF files with images or complex layouts may have mixed results</li>
                        <li>• Break very long texts into smaller sections for easier listening</li>
                        <li>• Experiment with different voices and speeds to find your preference</li>
                        <li>• <strong>Wait for suggested questions</strong> to automatically appear after uploading documents</li>
                        <li>• Use suggested questions as conversation starters or ask your own custom questions</li>
                        <li>• Longer documents generate more suggested questions (3-12 questions based on length)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
