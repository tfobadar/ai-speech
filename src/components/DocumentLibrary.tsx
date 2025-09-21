'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { format } from 'date-fns';

interface Document {
    id: number;
    title: string;
    content: string;
    summary?: string;
    contentLength: number;
    documentType: string;
    fileName?: string;
    createdAt: string;
    updatedAt: string;
}

interface ChatSession {
    id: number;
    sessionName: string;
    createdAt: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface UserChatHistory {
    documentId: number;
    documentTitle: string;
    documentType: string;
    fileName?: string;
    sessions: {
        sessionId: number;
        sessionName: string;
        sessionCreatedAt: string;
        chatHistory: {
            id: number;
            question: string;
            answer: string;
            suggestedQuestion: boolean;
            createdAt: string;
        }[];
    }[];
}

export default function DocumentLibrary() {
    const { user, isLoaded } = useUser();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [expandedContent, setExpandedContent] = useState<{ [key: number]: boolean }>({});
    const [activeTab, setActiveTab] = useState<'grid' | 'list' | 'details' | 'qa' | 'history'>('grid');

    // Q&A related state
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

    // User's complete Q&A history
    const [userChatHistory, setUserChatHistory] = useState<UserChatHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Fetch user's documents
    const fetchDocuments = async (search?: string) => {
        if (!user?.id || !isLoaded) return;

        try {
            const url = search
                ? `/api/documents?search=${encodeURIComponent(search)}&limit=50`
                : '/api/documents?limit=50';

            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                setDocuments(data.documents || []);
            } else {
                console.error('Error fetching documents:', data.error);
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    // Search documents
    const handleSearch = async () => {
        setLoading(true);
        await fetchDocuments(searchTerm);
    };

    // Delete document
    const deleteDocument = async (documentId: number) => {
        if (!confirm('Are you sure you want to delete this document? This will also delete all related chat sessions and data.')) {
            return;
        }

        try {
            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setDocuments(prev => prev.filter(doc => doc.id !== documentId));
                if (selectedDocument?.id === documentId) {
                    setSelectedDocument(null);
                    setChatSessions([]);
                }
                alert('Document deleted successfully');
            } else {
                const data = await response.json();
                alert('Error deleting document: ' + data.error);
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Error deleting document');
        }
    };

    // View document details
    const viewDocument = async (document: Document) => {
        setSelectedDocument(document);
        setActiveTab('details');

        try {
            const response = await fetch(`/api/documents/${document.id}`);
            const data = await response.json();

            if (response.ok) {
                setChatSessions(data.sessions || []);
            }
        } catch (error) {
            console.error('Error fetching document details:', error);
        }
    };

    // Toggle content expansion
    const toggleContent = (documentId: number) => {
        setExpandedContent(prev => ({
            ...prev,
            [documentId]: !prev[documentId]
        }));
    };

    // Format file size
    const formatFileSize = (length: number) => {
        if (length < 1024) return `${length} chars`;
        if (length < 1024 * 1024) return `${(length / 1024).toFixed(1)}K chars`;
        return `${(length / (1024 * 1024)).toFixed(1)}M chars`;
    };

    // Get document type icon
    const getDocumentIcon = (type: string) => {
        switch (type) {
            case 'pdf':
                return '📄';
            case 'doc':
            case 'docx':
                return '📝';
            case 'manual_text':
                return '✍️';
            default:
                return '📄';
        }
    };

    // Q&A Functions
    const loadChatHistory = async (documentId: number) => {
        console.log('🔄 Loading chat history for document:', documentId);

        // Reset states first
        setChatHistory([]);
        setCurrentSessionId(null);

        try {
            // First, check if there's an existing session for this document
            const sessionsUrl = `/api/documents/${documentId}/chat-sessions`;
            console.log('📡 Fetching sessions from:', sessionsUrl);

            const sessionsResponse = await fetch(sessionsUrl);
            console.log('📡 Sessions response status:', sessionsResponse.status);

            if (sessionsResponse.ok) {
                const sessions = await sessionsResponse.json();
                console.log('💬 Found sessions:', sessions);
                console.log('💬 Sessions count:', sessions.length);

                if (sessions.length > 0) {
                    // Use the first session
                    const session = sessions[0];
                    setCurrentSessionId(session.id);
                    console.log('✅ Using existing session:', session.id);

                    // Load chat history for this session
                    const historyUrl = `/api/chat-sessions/${session.id}/history`;
                    console.log('📡 Fetching history from:', historyUrl);

                    const historyResponse = await fetch(historyUrl);
                    console.log('📡 History response status:', historyResponse.status);

                    if (historyResponse.ok) {
                        const history = await historyResponse.json();
                        console.log('📝 Loaded chat history:', history);
                        console.log('📝 History length:', history.length);

                        if (Array.isArray(history)) {
                            setChatHistory(history);
                            console.log('✅ Chat history set successfully');
                        } else {
                            console.error('❌ History is not an array:', typeof history);
                        }
                    } else {
                        const errorText = await historyResponse.text();
                        console.error('❌ Failed to load history:', historyResponse.status, errorText);
                    }
                } else {
                    console.log('🆕 No existing sessions, creating new one');
                    // Create a new session
                    const createSessionResponse = await fetch('/api/chat-sessions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            documentId: documentId,
                            sessionName: `Q&A Session - ${new Date().toLocaleDateString()}`,
                        }),
                    });

                    if (createSessionResponse.ok) {
                        const newSession = await createSessionResponse.json();
                        setCurrentSessionId(newSession.id);
                        setChatHistory([]);
                        console.log('✅ Created new session:', newSession.id);
                    } else {
                        const errorText = await createSessionResponse.text();
                        console.error('❌ Failed to create session:', createSessionResponse.status, errorText);
                    }
                }
            } else {
                const errorText = await sessionsResponse.text();
                console.error('❌ Failed to fetch sessions:', sessionsResponse.status, errorText);
            }
        } catch (error) {
            console.error('💥 Error loading chat history:', error);
        }
    }; const loadSuggestedQuestions = async (documentId: number) => {
        try {
            const response = await fetch(`/api/documents/${documentId}/suggested-questions`);
            if (response.ok) {
                const questions = await response.json();
                setSuggestedQuestions(questions);
            }
        } catch (error) {
            console.error('Error loading suggested questions:', error);
        }
    };

    const askQuestion = async () => {
        if (!currentQuestion.trim() || !selectedDocument || !currentSessionId) return;

        const questionToAsk = currentQuestion.trim(); // Store the question before clearing it
        setIsAsking(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: questionToAsk,
                    context: selectedDocument.content
                })
            });

            if (response.ok) {
                const data = await response.json();

                // Add both user question and AI response to chat history
                const userMessage: ChatMessage = {
                    role: 'user',
                    content: questionToAsk,
                    timestamp: new Date().toISOString(),
                };

                const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: data.answer,
                    timestamp: new Date().toISOString(),
                };

                setChatHistory(prev => [...prev, userMessage, assistantMessage]);
                setCurrentQuestion('');

                // Save to database
                if (currentSessionId) {
                    await fetch('/api/chat-history', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: currentSessionId,
                            question: questionToAsk,
                            answer: data.answer
                        })
                    });
                }
            } else {
                const errorData = await response.json();
                alert('Error: ' + (errorData.error || 'Failed to get answer'));
            }
        } catch (error) {
            console.error('Error asking question:', error);
            alert('Error asking question');
        } finally {
            setIsAsking(false);
        }
    };

    const selectSuggestedQuestion = (question: string) => {
        setCurrentQuestion(question);
    };

    // Fetch complete user chat history
    const fetchUserChatHistory = async () => {
        if (!user?.id || !isLoaded) return;

        setHistoryLoading(true);
        try {
            const response = await fetch('/api/user-chat-history');
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Fetched user chat history:', data);
                setUserChatHistory(data.data || []);
            } else {
                console.error('❌ Failed to fetch user chat history:', await response.text());
            }
        } catch (error) {
            console.error('💥 Error fetching user chat history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id && isLoaded) {
            fetchDocuments();
        }
    }, [user?.id, isLoaded]);

    // Load Q&A data when switching to Q&A tab
    useEffect(() => {
        if (selectedDocument && activeTab === 'qa') {
            loadChatHistory(selectedDocument.id);
            loadSuggestedQuestions(selectedDocument.id);
        }
    }, [selectedDocument, activeTab]);

    // Load user history when switching to history tab
    useEffect(() => {
        if (activeTab === 'history') {
            fetchUserChatHistory();
        }
    }, [activeTab, user?.id, isLoaded]);

    if (!isLoaded) {
        return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    if (!user) {
        return <div className="text-center py-8">Please sign in to view your documents.</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Document Library</h1>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {documents.length} documents
                </span>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Search documents by title, content, or filename..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    🔍 Search
                </button>
                <button
                    onClick={() => { setSearchTerm(''); fetchDocuments(); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                    Clear
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('grid')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'grid'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Grid View
                    </button>
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'list'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        List View
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        📚 All Q&A History
                    </button>
                    {selectedDocument && (
                        <>
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'details'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                📄 Details
                            </button>
                            <button
                                onClick={() => setActiveTab('qa')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'qa'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                💬 Q&A
                            </button>
                        </>
                    )}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'grid' && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {searchTerm ? 'No documents found matching your search.' : 'No documents saved yet.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {documents.map((doc) => (
                                <div key={doc.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-shadow p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{getDocumentIcon(doc.documentType)}</span>
                                            <h3 className="font-medium text-sm truncate">{doc.title}</h3>
                                        </div>
                                        <button
                                            onClick={() => deleteDocument(doc.id)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                            title="Delete document"
                                        >
                                            🗑️
                                        </button>
                                    </div>

                                    <div className="space-y-2 mb-3">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            📅 {format(new Date(doc.createdAt), 'MMM dd, yyyy')}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            📄 {formatFileSize(doc.contentLength)}
                                        </div>
                                        {doc.fileName && (
                                            <div className="text-xs text-gray-500 truncate">
                                                📎 {doc.fileName}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-xs text-gray-700">
                                            {expandedContent[doc.id]
                                                ? doc.content
                                                : doc.content.substring(0, 150) + (doc.content.length > 150 ? '...' : '')
                                            }
                                        </div>

                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => toggleContent(doc.id)}
                                                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                                            >
                                                {expandedContent[doc.id] ? '👁️‍🗨️ Collapse' : '👁️ Expand'}
                                            </button>
                                            <button
                                                onClick={() => viewDocument(doc)}
                                                className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                                            >
                                                💬 Details
                                            </button>
                                        </div>
                                    </div>

                                    {doc.summary && (
                                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                                            <strong>Summary:</strong> {doc.summary.substring(0, 100)}...
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'list' && (
                <div className="space-y-2">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {searchTerm ? 'No documents found matching your search.' : 'No documents saved yet.'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {documents.map((doc) => (
                                <div key={doc.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <span className="text-xl">{getDocumentIcon(doc.documentType)}</span>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium truncate">{doc.title}</h3>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span>📅 {format(new Date(doc.createdAt), 'MMM dd, yyyy')}</span>
                                                    <span>📄 {formatFileSize(doc.contentLength)}</span>
                                                    {doc.fileName && <span className="truncate">📎 {doc.fileName}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => viewDocument(doc)}
                                                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm"
                                            >
                                                💬 View
                                            </button>
                                            <button
                                                onClick={() => deleteDocument(doc.id)}
                                                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'details' && selectedDocument && (
                <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">{getDocumentIcon(selectedDocument.documentType)}</span>
                            <h2 className="text-xl font-semibold">{selectedDocument.title}</h2>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
                            <div>
                                <strong>Created:</strong><br />
                                {format(new Date(selectedDocument.createdAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                            <div>
                                <strong>Size:</strong><br />
                                {formatFileSize(selectedDocument.contentLength)}
                            </div>
                            <div>
                                <strong>Type:</strong><br />
                                {selectedDocument.documentType}
                            </div>
                            {selectedDocument.fileName && (
                                <div>
                                    <strong>File:</strong><br />
                                    {selectedDocument.fileName}
                                </div>
                            )}
                        </div>

                        {selectedDocument.summary && (
                            <div className="p-4 bg-blue-50 rounded-lg mb-6">
                                <h4 className="font-medium mb-2">Summary</h4>
                                <p className="text-sm">{selectedDocument.summary}</p>
                            </div>
                        )}

                        <div className="mb-6">
                            <h4 className="font-medium mb-2">Content</h4>
                            <div className="p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                                <pre className="text-sm whitespace-pre-wrap">{selectedDocument.content}</pre>
                            </div>
                        </div>

                        {chatSessions.length > 0 && (
                            <div>
                                <h4 className="font-medium mb-2">Chat Sessions ({chatSessions.length})</h4>
                                <div className="space-y-2">
                                    {chatSessions.map((session) => (
                                        <div key={session.id} className="flex items-center justify-between p-3 border rounded">
                                            <div>
                                                <div className="font-medium">{session.sessionName}</div>
                                                <div className="text-sm text-gray-500">
                                                    {format(new Date(session.createdAt), 'MMM dd, yyyy HH:mm')}
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (confirm('Delete this chat session?')) {
                                                        try {
                                                            const response = await fetch(`/api/chat-sessions/${session.id}`, {
                                                                method: 'DELETE',
                                                            });
                                                            if (response.ok) {
                                                                setChatSessions(prev => prev.filter(s => s.id !== session.id));
                                                                alert('Chat session deleted successfully');
                                                            }
                                                        } catch (error) {
                                                            console.error('Error deleting session:', error);
                                                            alert('Error deleting chat session');
                                                        }
                                                    }
                                                }}
                                                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Q&A Tab Content */}
            {activeTab === 'qa' && selectedDocument && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg border">
                        <h3 className="text-lg font-medium mb-4">💬 Ask Questions About This Document</h3>

                        {/* Question Input */}
                        <div className="mb-6">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ask a question about this document..."
                                    value={currentQuestion}
                                    onChange={(e) => setCurrentQuestion(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !isAsking && askQuestion()}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={isAsking}
                                />
                                <button
                                    onClick={askQuestion}
                                    disabled={!currentQuestion.trim() || isAsking}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    {isAsking ? '🤔 Thinking...' : '💬 Ask'}
                                </button>
                            </div>
                        </div>

                        {/* Suggested Questions */}
                        {suggestedQuestions.length > 0 && (
                            <div className="mb-6">
                                <h4 className="font-medium mb-2">💡 Suggested Questions</h4>
                                <div className="flex flex-wrap gap-2">
                                    {suggestedQuestions.map((question, index) => (
                                        <button
                                            key={`suggestion-${index}`}
                                            onClick={() => selectSuggestedQuestion(question)}
                                            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 border"
                                        >
                                            {question}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Chat History */}
                        <div className="space-y-4">
                            <h4 className="font-medium">📝 Conversation History</h4>
                            {chatHistory.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No questions asked yet. Start by asking a question about this document!
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {chatHistory.map((message, index) => (
                                        <div key={`message-${index}`} className={`p-4 rounded-lg ${message.role === 'user'
                                            ? 'bg-blue-50 border-l-4 border-blue-500'
                                            : 'bg-gray-50 border-l-4 border-gray-400'
                                            }`}>
                                            <div className="font-medium text-sm mb-1">
                                                {message.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
                                            </div>
                                            <div className="text-sm">{message.content}</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {format(new Date(message.timestamp), 'MMM dd, yyyy HH:mm')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* All Q&A History Tab Content */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg border">
                        <h3 className="text-lg font-medium mb-4">📚 Complete Q&A History</h3>

                        {historyLoading ? (
                            <div className="flex justify-center items-center h-32">
                                <div className="text-gray-500">Loading your Q&A history...</div>
                            </div>
                        ) : userChatHistory.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No Q&A history found. Start asking questions about your documents!
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {userChatHistory.map((docHistory) => (
                                    <div key={`doc-${docHistory.documentId}`} className="border rounded-lg p-4 bg-gray-50">
                                        {/* Document Header */}
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-2xl">
                                                    {docHistory.documentType === 'pdf' ? '📄' :
                                                        docHistory.documentType === 'doc' || docHistory.documentType === 'docx' ? '📝' : '✍️'}
                                                </span>
                                                <div>
                                                    <h4 className="font-semibold text-lg">{docHistory.documentTitle}</h4>
                                                    {docHistory.fileName && (
                                                        <p className="text-sm text-gray-500">{docHistory.fileName}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {docHistory.sessions.length} session{docHistory.sessions.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>

                                        {/* Sessions */}
                                        <div className="space-y-4">
                                            {docHistory.sessions.map((session) => (
                                                <div key={`session-${session.sessionId}`} className="bg-white rounded-lg p-4 border">
                                                    {/* Session Header */}
                                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                                                        <h5 className="font-medium text-gray-900">{session.sessionName}</h5>
                                                        <div className="text-xs text-gray-500">
                                                            {format(new Date(session.sessionCreatedAt), 'MMM dd, yyyy HH:mm')}
                                                        </div>
                                                    </div>

                                                    {/* Q&A History for this session */}
                                                    <div className="space-y-3">
                                                        {session.chatHistory.map((qa) => (
                                                            <div key={`qa-${qa.id}`} className="space-y-2">
                                                                {/* Question */}
                                                                <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="font-medium text-sm text-blue-700">
                                                                            👤 Question {qa.suggestedQuestion ? '(Suggested)' : ''}
                                                                        </span>
                                                                        <span className="text-xs text-blue-600">
                                                                            {format(new Date(qa.createdAt), 'MMM dd, HH:mm')}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-800">{qa.question}</p>
                                                                </div>

                                                                {/* Answer */}
                                                                <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-gray-400 ml-4">
                                                                    <div className="font-medium text-sm text-gray-700 mb-1">
                                                                        🤖 AI Assistant
                                                                    </div>
                                                                    <p className="text-sm text-gray-800">{qa.answer}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {session.chatHistory.length === 0 && (
                                                        <div className="text-center text-gray-500 text-sm py-2">
                                                            No questions in this session yet.
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}