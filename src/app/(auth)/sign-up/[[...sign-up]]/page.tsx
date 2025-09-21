'use client'

import { SignUp, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Page() {
    const { isSignedIn, isLoaded, user } = useUser()
    const router = useRouter()
    const [redirectAttempted, setRedirectAttempted] = useState(false)
    const [debugInfo, setDebugInfo] = useState('')

    useEffect(() => {
        if (isLoaded && isSignedIn && !redirectAttempted) {
            setRedirectAttempted(true)
            setDebugInfo(`Attempting redirect for user: ${user?.id}`)
            console.log('Sign-up page: Attempting redirect to dashboard')

            // Use window.location instead of router.push for more reliable redirect
            setTimeout(() => {
                window.location.href = '/dashboard'
            }, 100)
        }
    }, [isLoaded, isSignedIn, user, redirectAttempted])

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (isSignedIn) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Redirecting to dashboard...</p>
                    <p className="text-sm text-gray-500 mt-2">{debugInfo}</p>
                    <Link
                        href="/dashboard"
                        className="text-blue-600 underline mt-4 block"
                    >
                        Click here if not redirected automatically
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <SignUp />
        </div>
    )
}