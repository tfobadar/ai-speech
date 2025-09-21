import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import DocumentLibrary from '@/components/DocumentLibrary';

export default async function DocumentLibraryPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <DocumentLibrary />
        </main>
    );
}
