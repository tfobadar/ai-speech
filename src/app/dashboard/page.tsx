'use client'

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function Dashboard() {
  const { isSignedIn, isLoaded } = useUser();

  // If not loaded yet, show loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If not signed in, show sign in prompt (but don't auto-redirect)
  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please Sign In</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to access the dashboard.</p>
          <Link
            href="/sign-in"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // User is signed in, show dashboard
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        {/* Header with user info */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-left">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">AI Studio Dashboard</h1>
            <p className="text-lg text-gray-600">Create amazing content using Google AI</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome back!</span>
            <UserButton />
          </div>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <nav className="bg-white rounded-lg shadow p-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
              <Link
                href="/dashboard"
                className="py-3 px-4 text-center rounded-md bg-blue-600 text-white font-medium transition-colors"
              >
                🎬 Video Generation
              </Link>
              <Link
                href="/text-to-speech"
                className="py-3 px-4 text-center rounded-md text-gray-700 hover:bg-gray-100 font-medium transition-colors"
              >
                🔊 Text to Speech
              </Link>
              <Link
                href="/image-to-text"
                className="py-3 px-4 text-center rounded-md text-gray-700 hover:bg-gray-100 font-medium transition-colors"
              >
                � Document to Text
              </Link>
            </div>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h2>
          <p className="text-gray-600 mb-6">Welcome to your AI Studio dashboard! 🚀</p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Video Generation</h3>
              <p className="text-blue-600">Create amazing videos with AI technology</p>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">Text to Speech</h3>
              <p className="text-purple-600">Convert text to natural-sounding speech</p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Document to Text (OCR)</h3>
              <p className="text-green-600">Extract text from images and PDF files using AI-powered OCR</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}