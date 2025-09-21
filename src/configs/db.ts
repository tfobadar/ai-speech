import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import '../lib/env-override'; // Ensure environment variables are set

// Temporarily hardcoded for production deployment
const databaseUrl = process.env.DATABASE_URL ||
    process.env.NEXT_PUBLIC_DATABASE_URL ||
    'postgresql://neondb_owner:npg_3B1tvYQplkIy@ep-mute-salad-ab93deyl-pooler.eu-west-2.aws.neon.tech/text-speech-ai?sslmode=require';

if (!databaseUrl) {
    throw new Error('Database URL not found. Please set DATABASE_URL or NEXT_PUBLIC_DATABASE_URL environment variable.');
}

console.log('📊 Database: Connecting to database...', databaseUrl ? 'URL found' : 'URL missing');

const sql = neon(databaseUrl);
export const db = drizzle({ client: sql });