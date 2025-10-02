import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Document to Text (OCR)',
    description: 'Extract text from images and PDF files using advanced AI-powered optical character recognition. Upload documents and get accurate text extraction with intelligent chat features.',
    keywords: [
        'OCR',
        'optical character recognition',
        'PDF to text',
        'image to text',
        'document processing',
        'text extraction',
        'AI document analysis',
        'PDF processing'
    ],
    openGraph: {
        title: 'Document to Text (OCR) | AI Text Extraction',
        description: 'Extract text from images and PDF files using advanced AI-powered optical character recognition.',
        url: '/image-to-text',
    },
    twitter: {
        title: 'Document to Text (OCR) | AI Text Extraction',
        description: 'Extract text from images and PDF files using advanced AI-powered optical character recognition.',
    },
}

export default function ImageToTextLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
