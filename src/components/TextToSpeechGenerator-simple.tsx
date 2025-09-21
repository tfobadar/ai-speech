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

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = speechSynthesis.getVoices();
            setVoices(availableVoices);
            const englishVoice = availableVoices.find(voice => voice.lang.startsWith('en'));
            if (englishVoice) {
                setSelectedVoice(englishVoice.name);
            }
        };
        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsProcessingFile(true);
        try {
            let extractedText = '';
            if (file.type === 'text/plain') {
                extractedText = await file.text();
            } else {
                alert('Only .txt files are supported currently');
                setIsProcessingFile(false);
                return;
            }
            if (extractedText) {
                setText(prev => prev + (prev ? '\n\n' : '') + extractedText);
                alert(`Successfully extracted ${extractedText.length} characters from ${file.name}`);
            }
        } catch (error) {
            alert('Error processing file');
        } finally {
            setIsProcessingFile(false);
            e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) {
            alert('Please enter some text');
            return;
        }
        setIsGenerating(true);
        setAudioUrl(null);
        try {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text.trim());
                utterance.rate = rate;
                utterance.pitch = pitch;
                utterance.volume = 1.0;
                const selectedVoiceObj = voices.find(voice => voice.name === selectedVoice);
                if (selectedVoiceObj) {
                    utterance.voice = selectedVoiceObj;
                }
                utterance.onstart = () => {
                    setIsPlaying(true);
                    alert('Speech generated successfully! Playing now...');
                };
                utterance.onend = () => {
                    setIsPlaying(false);
                    setIsGenerating(false);
                };
                utterance.onerror = (event) => {
                    setIsPlaying(false);
                    setIsGenerating(false);
                    alert('Error: ' + event.error);
                };
                setAudioUrl('browser-tts-' + Date.now());
                speechSynthesis.speak(utterance);
            }
        } catch (error) {
            alert('Failed to generate speech');
            setIsGenerating(false);
        }
    };

    const playAudio = () => {
        if (audioUrl && text.trim()) {
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text.trim());
            utterance.rate = rate;
            utterance.pitch = pitch;
            utterance.volume = 1.0;
            const selectedVoiceObj = voices.find(voice => voice.name === selectedVoice);
            if (selectedVoiceObj) {
                utterance.voice = selectedVoiceObj;
            }
            utterance.onstart = () => setIsPlaying(true);
            utterance.onend = () => setIsPlaying(false);
            speechSynthesis.speak(utterance);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">Configure Speech</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">📎 Upload File (Optional)</label>
                            <input
                                type="file"
                                onChange={handleFileUpload}
                                accept=".txt"
                                disabled={isProcessingFile}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                                Supported: .txt files
                                {isProcessingFile && <span className="text-purple-600 ml-2">Processing...</span>}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Text to Convert *</label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Enter text or upload a file..."
                                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                                maxLength={4000}
                                required
                            />
                            <div className="text-xs text-gray-500 mt-1">Characters: {text.length}/4000</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">🎤 Voice</label>
                                <select
                                    value={selectedVoice}
                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    {voices.map((voice) => (
                                        <option key={voice.name} value={voice.name}>
                                            {voice.name} ({voice.lang})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">⚡ Speed: {rate}x</label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={rate}
                                    onChange={(e) => setRate(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">🎵 Pitch: {pitch}</label>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={pitch}
                                onChange={(e) => setPitch(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={isGenerating || !text.trim()}
                                className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
                            >
                                {isGenerating ? 'Generating...' : '🎵 Generate Speech'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setText('')}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </form>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">Generated Speech</h2>
                    {audioUrl ? (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
                                <p className="font-medium">✅ Speech Ready!</p>
                                <p className="text-sm mt-1">Using: {voices.find(v => v.name === selectedVoice)?.name || 'Default Voice'}</p>
                            </div>
                            <button
                                onClick={playAudio}
                                disabled={isPlaying}
                                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                                {isPlaying ? 'Playing...' : 'Play Audio'}
                            </button>
                            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                <p><strong>Voice:</strong> {voices.find(v => v.name === selectedVoice)?.name || 'Default'}</p>
                                <p><strong>Speed:</strong> {rate}x</p>
                                <p><strong>Pitch:</strong> {pitch}</p>
                                <p><strong>Status:</strong> {isPlaying ? 'Playing...' : 'Ready'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            <p>No speech generated yet</p>
                            <p className="text-sm mt-1">Enter text and click Generate Speech</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Enhanced Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div>
                        <h4 className="font-medium text-gray-700 mb-2">📂 File Upload</h4>
                        <p className="text-gray-600">Upload .txt files directly for conversion</p>
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-700 mb-2">🎤 Voice Selection</h4>
                        <p className="text-gray-600">Choose from {voices.length} available voices</p>
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-700 mb-2">⚡ Speed & Pitch Control</h4>
                        <p className="text-gray-600">Adjust playback speed and voice pitch</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
