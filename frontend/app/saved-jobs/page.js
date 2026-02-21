'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function SavedJobsPage() {
    const [savedJobs, setSavedJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    useEffect(() => {
        // Load saved jobs from localStorage
        const saved = localStorage.getItem('savedJobs')
        setSavedJobs(saved ? JSON.parse(saved) : [])
        setLoading(false)
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        setIsLoggedIn(!!token)
    }, [])

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Saved Jobs</h2>

                {savedJobs.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600 mb-4">You haven't saved any jobs yet</p>
                        <Link href="/jobs" className="text-indigo-600 hover:underline">Browse jobs →</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedJobs.map((job) => (
                            <div key={job.id} className="bg-white rounded-lg shadow hover:shadow-lg p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h3>
                                <p className="text-gray-600 text-sm mb-4">{job.location}</p>
                                <Link href={`/jobs/${job.id}`} className="text-indigo-600 hover:underline">
                                    View Details →
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
