'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Navbar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        setIsLoggedIn(!!token)
    }, [])

    return (
        <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-indigo-600">JobSeek</h1>
                <div className="space-x-4">
                    <Link href="/jobs" className="text-gray-600 hover:text-indigo-600">Browse Jobs</Link>
                    {isLoggedIn ? (
                        <>
                            <Link href="/profile" className="text-gray-600 hover:text-indigo-600">Profile</Link>
                            <button onClick={() => {
                                localStorage.removeItem('token')
                                window.location.href = '/'
                            }} className="text-gray-600 hover:text-indigo-600">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="text-gray-600 hover:text-indigo-600">Login</Link>
                            <Link href="/register" className="text-gray-600 hover:text-indigo-600">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}
