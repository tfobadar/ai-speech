import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load environment variables from .env.local
config({ path: '.env.local' });

export default defineConfig({
    out: './drizzle',
    schema: './src/configs/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: 'postgresql://neondb_owner:npg_3B1tvYQplkIy@ep-mute-salad-ab93deyl-pooler.eu-west-2.aws.neon.tech/text-speech-ai?sslmode=require&channel_binding=require',
    },
});
