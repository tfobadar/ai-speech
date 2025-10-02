import Script from 'next/script'

interface StructuredDataProps {
    type?: 'WebApplication' | 'SoftwareApplication' | 'WebPage'
    name?: string
    description?: string
    url?: string
}

export default function StructuredData({
    type = 'WebApplication',
    name = 'AI Text-to-Speech',
    description = 'Transform text into natural-sounding speech and extract text from documents using advanced AI technology',
    url = 'https://ai-speech.vercel.app'
}: StructuredDataProps) {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": type,
        "name": name,
        "description": description,
        "url": url,
        "applicationCategory": "ProductivityApplication",
        "operatingSystem": "Web Browser",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "featureList": [
            "Text to Speech Conversion",
            "Document OCR (Optical Character Recognition)",
            "PDF Text Extraction",
            "Image Text Extraction",
            "AI-Powered Chat",
            "Google AI Integration"
        ],
        "creator": {
            "@type": "Organization",
            "name": "AI Text-to-Speech Team"
        },
        "softwareVersion": "1.0",
        "dateModified": new Date().toISOString(),
        "browserRequirements": "Requires JavaScript and modern web browser"
    }

    return (
        <Script
            id="structured-data"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(structuredData)
            }}
        />
    )
}
