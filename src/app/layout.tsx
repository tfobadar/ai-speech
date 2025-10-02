import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Provider from "./provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Text-to-Speech | Convert Text to Natural Speech with AI",
    template: "%s | AI Text-to-Speech"
  },
  description: "Transform text into natural-sounding speech and extract text from documents using advanced AI technology. Powered by Google AI Studio for high-quality voice synthesis and optical character recognition.",
  keywords: [
    "text to speech",
    "AI voice synthesis",
    "document OCR",
    "text extraction",
    "PDF to text",
    "image to text",
    "Google AI",
    "artificial intelligence",
    "voice generation",
    "speech synthesis",
    "document processing",
    "AI chat",
    "text analysis"
  ],
  authors: [{ name: "AI Text-to-Speech Team" }],
  creator: "AI Text-to-Speech",
  publisher: "AI Text-to-Speech",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://ai-speech.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ai-speech.vercel.app",
    title: "AI Text-to-Speech | Convert Text to Natural Speech with AI",
    description: "Transform text into natural-sounding speech and extract text from documents using advanced AI technology. Powered by Google AI Studio.",
    siteName: "AI Text-to-Speech",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "AI Text-to-Speech - Convert Text to Natural Speech",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Text-to-Speech | Convert Text to Natural Speech with AI",
    description: "Transform text into natural-sounding speech and extract text from documents using advanced AI technology.",
    images: ["/og-image.jpg"],
    creator: "@ai_texttospeech",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#2563eb" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/icon-192.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="mobile-web-app-capable" content="yes" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <Provider>
            {children}
          </Provider>
        </body>
      </html>
    </ClerkProvider>
  );
}
