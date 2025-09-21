import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Use server-side environment variable for production security
// Fallback to NEXT_PUBLIC_DATABASE_URL for development only
const databaseUrl = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_DATABASE_URL;

if (!databaseUrl) {
    throw new Error('Database URL not found. Please set DATABASE_URL or NEXT_PUBLIC_DATABASE_URL environment variable.');
}

console.log('📊 Database: Connecting to database...', databaseUrl ? 'URL found' : 'URL missing');

const sql = neon(databaseUrl);
export const db = drizzle({ client: sql });