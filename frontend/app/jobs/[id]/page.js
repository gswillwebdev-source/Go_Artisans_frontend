'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'

export default function JobDetailsPage() {
    const params = useParams()
    const [job, setJob] = useState(null)
    const [client, setClient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [applying, setApplying] = useState(false)
    const [token, setToken] = useState(null)

    useEffect(() => {
        const tkn = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        setToken(tkn)
        fetchJob()
    }, [params.id])

    const fetchJob = async () => {
        try {
            setLoading(true)
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${params.id}`)
            const jobData = response.data
            setJob(jobData)

            // Fetch client info if job has posted_by
            if (jobData.posted_by) {
                try {
                    const clientResponse = await axios.get(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/users/worker/${jobData.posted_by}`
                    )
                    setClient(clientResponse.data.worker)
                } catch (err) {
                    console.error('Failed to fetch client info:', err)
                }
            }
        } catch (err) {
            console.error('Failed to fetch job:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleApply = async () => {
        if (!token) {
            alert('Please login to apply for this job')
            window.location.href = '/login'
            return
        }

        try {
            setApplying(true)
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/applications`,
                { jobId: params.id },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            alert('Application submitted successfully!')
        } catch (err) {
            alert(err.response?.data?.error || 'Application failed')
        } finally {
            setApplying(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    if (!job) return <div className="min-h-screen flex items-center justify-center">Job not found</div>

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Link href="/jobs" className="text-indigo-600 hover:text-indigo-700">← Back to Jobs</Link>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow p-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">{job.title}</h1>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 mt-4">
                        <div className="bg-gray-50 p-4 rounded">
                            <p className="text-sm text-gray-600">Location</p>
                            <p className="font-semibold">{job.location}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded">
                            <p className="text-sm text-gray-600">Job Type</p>
                            <p className="font-semibold">{job.job_type}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded">
                            <p className="text-sm text-gray-600">Budget</p>
                            <p className="font-semibold text-indigo-600">CFA {job.salary || 'Competitive'}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded">
                            <p className="text-sm text-gray-600">Posted</p>
                            <p className="font-semibold">{new Date(job.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Description</h2>
                        <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
                    </div>

                    {/* Client Info Section */}
                    {client && (
                        <div className="mb-8 bg-indigo-50 p-6 rounded-lg">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">About Client</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Client Name</p>
                                    <p className="font-semibold text-lg">{client.firstName} {client.lastName}</p>
                                </div>
                                {client.email && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Email</p>
                                        <p className="font-medium text-indigo-600">{client.email}</p>
                                    </div>
                                )}
                                {client.phoneNumber && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Phone</p>
                                        <p className="font-medium">{client.phoneNumber}</p>
                                    </div>
                                )}
                                {client.location && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Location</p>
                                        <p className="font-medium">{client.location}</p>
                                    </div>
                                )}
                                {client.rating > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Rating</p>
                                        <p className="font-medium">⭐ {client.rating.toFixed(1)} / 5.0</p>
                                    </div>
                                )}
                                {client.completedJobs > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Jobs Posted</p>
                                        <p className="font-medium">{client.completedJobs} jobs</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleApply}
                        disabled={applying}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold text-lg transition"
                    >
                        {applying ? 'Applying...' : 'Apply Now'}
                    </button>
                </div>
            </div>
        </div>
    )
}
