'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'

export default function JobDetailsPage() {
    const params = useParams()
    const [job, setJob] = useState(null)
    const [loading, setLoading] = useState(true)
    const [applying, setApplying] = useState(false)

    useEffect(() => {
        fetchJob()
    }, [params.id])

    const fetchJob = async () => {
        try {
            setLoading(true)
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${params.id}`)
            setJob(response.data)
        } catch (err) {
            console.error('Failed to fetch job:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleApply = async () => {
        try {
            setApplying(true)
            const token = localStorage.getItem('token')
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
                    <a href="/jobs" className="text-indigo-600 hover:text-indigo-700">← Back to Jobs</a>
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
                            <p className="text-sm text-gray-600">Salary</p>
                            <p className="font-semibold">${job.salary || 'Competitive'}</p>
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

                    <button
                        onClick={handleApply}
                        disabled={applying}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold text-lg"
                    >
                        {applying ? 'Applying...' : 'Apply Now'}
                    </button>
                </div>
            </div>
        </div>
    )
}
