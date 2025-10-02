import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Dashboard',
    description: 'Access your AI-powered text-to-speech tools and document processing features. Convert text to speech, extract text from PDFs and images, and chat with AI about your documents.',
    openGraph: {
        title: 'AI Dashboard | Text-to-Speech & Document Processing',
        description: 'Access your AI-powered text-to-speech tools and document processing features.',
        url: '/dashboard',
    },
    twitter: {
        title: 'AI Dashboard | Text-to-Speech & Document Processing',
        description: 'Access your AI-powered text-to-speech tools and document processing features.',
    },
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
