'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import apiClient from '@/lib/apiClient'
import JobCard from '@/components/JobCard'

export default function SavedJobsPage() {
    const [savedJobs, setSavedJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    useEffect(() => {
        const fetchSavedJobs = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
                if (!token) {
                    setIsLoggedIn(false)
                    setLoading(false)
                    return
                }

                setIsLoggedIn(true)
                apiClient.setToken(token)
                const response = await apiClient.getSavedJobs()
                setSavedJobs(response.data.jobs || [])
            } catch (err) {
                console.error('Error fetching saved jobs:', err)
                setError(err.response?.data?.error || 'Failed to load saved jobs')
            } finally {
                setLoading(false)
            }
        }

        fetchSavedJobs()
    }, [])

    const handleUnsave = async (jobId) => {
        setSavedJobs(savedJobs.filter(job => job.id !== jobId))
    }

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center py-12">
                        <p className="text-gray-600 mb-4">Please log in to view saved jobs</p>
                        <Link href="/login" className="text-indigo-600 hover:underline">Log in →</Link>
                    </div>
                </div>
            </div>
        )
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Saved Jobs</h2>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
                        {error}
                    </div>
                )}

                {savedJobs.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600 mb-4">You haven't saved any jobs yet</p>
                        <Link href="/jobs" className="text-indigo-600 hover:underline">Browse jobs →</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedJobs.map((job) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                isSaved={true}
                                onSaveToggle={handleUnsave}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
