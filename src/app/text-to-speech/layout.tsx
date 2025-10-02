import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Text to Speech',
    description: 'Convert any text into natural-sounding speech using advanced AI voice synthesis. Choose from multiple voices and download high-quality audio files.',
    keywords: [
        'text to speech',
        'AI voice synthesis',
        'speech generation',
        'voice conversion',
        'audio generation',
        'Google AI voice'
    ],
    openGraph: {
        title: 'Text to Speech | AI Voice Synthesis',
        description: 'Convert any text into natural-sounding speech using advanced AI voice synthesis.',
        url: '/text-to-speech',
    },
    twitter: {
        title: 'Text to Speech | AI Voice Synthesis',
        description: 'Convert any text into natural-sounding speech using advanced AI voice synthesis.',
    },
}

export default function TextToSpeechLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
