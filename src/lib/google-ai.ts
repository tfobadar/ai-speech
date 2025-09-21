import { GoogleGenerativeAI } from '@google/generative-ai';
import './env-override'; // Ensure environment variables are set

// Temporarily hardcoded for production deployment
const API_KEY = process.env.GOOGLE_AI_API_KEY || 'AIzaSyBL3NDaNPLIJDTuEB00pk8CbBqAUFPa9nE';
const PROJECT_NUMBER = process.env.GOOGLE_PROJECT_NUMBER || '545088964055';

console.log('[GOOGLE-AI] Initializing with API key available:', !!API_KEY);
console.log('[GOOGLE-AI] Project number available:', !!PROJECT_NUMBER);

if (!API_KEY) {
    console.error('[GOOGLE-AI] GOOGLE_AI_API_KEY is not set in environment variables');
    throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
}

if (!PROJECT_NUMBER) {
    console.warn('[GOOGLE-AI] GOOGLE_PROJECT_NUMBER is not set - this may affect some functionality');
}

// Initialize the Google Generative AI client
const genAI = (() => {
    try {
        const client = new GoogleGenerativeAI(API_KEY);
        console.log('[GOOGLE-AI] Client initialized successfully');
        return client;
    } catch (error) {
        console.error('[GOOGLE-AI] Failed to initialize client:', error);
        throw error;
    }
})();

export { genAI, PROJECT_NUMBER };
