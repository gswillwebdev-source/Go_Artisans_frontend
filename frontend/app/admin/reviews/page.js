'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminReviewsManagement from '@/components/AdminReviewsManagement';

export default function AdminReviewsPage() {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Check if admin is logged in
        const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
        if (!token) {
            router.push('/admin/login');
            return;
        }
        setIsChecking(false);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
    };

    if (isChecking) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-red-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <Link href="/admin/dashboard" className="text-2xl font-bold">
                            GoArtisans Admin
                        </Link>
                        <div className="flex gap-4 items-center">
                            <Link href="/admin/dashboard" className="hover:bg-red-700 px-3 py-2 rounded">
                                Dashboard
                            </Link>
                            <Link href="/admin/users" className="hover:bg-red-700 px-3 py-2 rounded">
                                Users
                            </Link>
                            <Link href="/admin/reviews" className="bg-red-700 hover:bg-red-800 px-3 py-2 rounded">
                                Reviews
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="bg-red-700 hover:bg-red-800 px-3 py-2 rounded font-semibold"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <AdminReviewsManagement />
            </div>
        </div>
    );
}
