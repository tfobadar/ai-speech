export const VIDEO_STYLES = {
    mobile: {
        label: 'Mobile (9:16)',
        aspectRatio: '9:16',
        description: 'Optimized for mobile viewing and social media',
        icon: '📱'
    },
    desktop: {
        label: 'Desktop (16:9)',
        aspectRatio: '16:9',
        description: 'Standard widescreen format for desktop and web',
        icon: '🖥️'
    }
} as const;

export const DURATION_PRESETS = [
    { value: 15, label: '15s', description: 'Quick clip' },
    { value: 30, label: '30s', description: 'Short video' },
    { value: 60, label: '1m', description: 'Standard length' },
    { value: 120, label: '2m', description: 'Extended video' },
    { value: 300, label: '5m', description: 'Long form' }
];

export const PRESET_PROMPTS = [
    {
        title: 'Nature Scene',
        prompt: 'A serene sunset over a mountain landscape with birds flying across the sky'
    },
    {
        title: 'City Life',
        prompt: 'A bustling city street at night with neon lights and people walking'
    },
    {
        title: 'Ocean View',
        prompt: 'Peaceful ocean waves gently washing onto a sandy beach with seagulls'
    },
    {
        title: 'Cozy Interior',
        prompt: 'A warm fireplace in a rustic cabin during winter with snow falling outside'
    },
    {
        title: 'Flower Field',
        prompt: 'A vast field of colorful wildflowers swaying in a gentle summer breeze'
    },
    {
        title: 'Space Theme',
        prompt: 'A beautiful view of Earth from space with stars twinkling in the background'
    },
    {
        title: 'Forest Walk',
        prompt: 'A peaceful walk through a dense forest with sunlight filtering through leaves'
    },
    {
        title: 'Abstract Art',
        prompt: 'Flowing abstract shapes and colors morphing in smooth, hypnotic patterns'
    }
];

export function validateVideoRequest(request: any): string[] {
    const errors: string[] = [];

    if (!request.prompt || typeof request.prompt !== 'string') {
        errors.push('Prompt is required and must be a string');
    } else if (request.prompt.trim().length < 10) {
        errors.push('Prompt must be at least 10 characters long');
    } else if (request.prompt.length > 1000) {
        errors.push('Prompt must be less than 1000 characters');
    }

    if (!request.style || !['mobile', 'desktop'].includes(request.style)) {
        errors.push('Style must be either "mobile" or "desktop"');
    }

    if (!request.duration || typeof request.duration !== 'number') {
        errors.push('Duration is required and must be a number');
    } else if (request.duration < 5 || request.duration > 300) {
        errors.push('Duration must be between 5 and 300 seconds');
    }

    if (typeof request.includeAudio !== 'boolean') {
        errors.push('includeAudio must be a boolean value');
    }

    return errors;
}

export function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

export function generateJobId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `job_${timestamp}_${random}`;
}

export function estimateProcessingTime(duration: number, style: string, includeAudio: boolean): number {
    // Base processing time (in seconds)
    let baseTime = 30;

    // Add time based on duration
    baseTime += duration * 2;

    // Add time for audio processing
    if (includeAudio) {
        baseTime += 20;
    }

    // Mobile videos might take slightly longer due to format conversion
    if (style === 'mobile') {
        baseTime += 10;
    }

    return Math.min(baseTime, 300); // Cap at 5 minutes
}

export function createEnhancedPrompt(request: any): string {
    let prompt = request.prompt.trim();

    // Add style specifications
    const styleInfo = VIDEO_STYLES[request.style as keyof typeof VIDEO_STYLES];
    prompt += ` Create this as a ${styleInfo.description.toLowerCase()} with ${styleInfo.aspectRatio} aspect ratio.`;

    // Add duration specification
    prompt += ` The video should be approximately ${formatDuration(request.duration)} long.`;

    // Add quality and style specifications
    prompt += ' Ensure high quality, smooth transitions, and cinematic appeal.';

    // Add audio specification
    if (request.includeAudio) {
        prompt += ' Include appropriate background music and ambient sound effects that complement the scene.';
    } else {
        prompt += ' Create a silent video without any audio track.';
    }

    return prompt;
}
