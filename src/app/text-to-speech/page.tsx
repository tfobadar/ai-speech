'use client'

import TextToSpeechGenerator from '../../components/TextToSpeechGenerator-full';
import { UserButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function TextToSpeechPage() {
    const { isSignedIn, isLoaded } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push('/sign-in');
        }
    }, [isLoaded, isSignedIn, router]);

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p>Redirecting to sign in...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="container mx-auto px-4 py-8">
                {/* Header with user info */}
                <div className="flex justify-between items-center mb-8">
                    <div className="text-left">
                        <h1 className="text-4xl font-bold text-gray-800 mb-2"></h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">Welcome back!</span>
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </div>

                {/* Navigation */}
                {/* <div className="mb-8">
                    <nav className="bg-white rounded-lg shadow-md p-1">
                        <div className="flex space-x-1">
                            <Link
                                href="/dashboard"
                                className="flex-1 py-3 px-4 text-center rounded-md text-gray-700 hover:bg-gray-100 font-medium transition-colors"
                            >
                                🎬 Video Generation
                            </Link>
                            <Link
                                href="/text-to-speech"
                                className="flex-1 py-3 px-4 text-center rounded-md bg-purple-600 text-white font-medium transition-colors"
                            >
                                🔊 Text to Speech
                            </Link>
                        </div>
                    </nav>
                </div> */}

                <TextToSpeechGenerator />
            </div>
        </div>
    );
}
