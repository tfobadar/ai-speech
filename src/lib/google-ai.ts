import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GOOGLE_AI_API_KEY;
const PROJECT_NUMBER = process.env.GOOGLE_PROJECT_NUMBER;

if (!API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
}

if (!PROJECT_NUMBER) {
    throw new Error('GOOGLE_PROJECT_NUMBER is not set in environment variables');
}

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(API_KEY);

export { genAI, PROJECT_NUMBER };
