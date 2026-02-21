'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import JobCard from '@/components/JobCard'
import SearchBar from '@/components/SearchBar'

export default function JobsPage() {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        keyword: '',
        location: '',
        jobType: '',
    })

    useEffect(() => {
        fetchJobs()
    }, [])

    const fetchJobs = async () => {
        try {
            setLoading(true)
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs`)
            setJobs(response.data.jobs)
        } catch (err) {
            console.error('Failed to fetch jobs:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async (searchFilters) => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (searchFilters.keyword) params.append('keyword', searchFilters.keyword)
            if (searchFilters.location) params.append('location', searchFilters.location)
            if (searchFilters.jobType) params.append('jobType', searchFilters.jobType)

            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/search?${params.toString()}`
            )
            setJobs(response.data.jobs)
        } catch (err) {
            console.error('Search failed:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-indigo-600">JobSeek</h1>
                    <div className="space-x-4">
                        <a href="/profile" className="text-gray-600 hover:text-indigo-600">Profile</a>
                        <a href="/saved-jobs" className="text-gray-600 hover:text-indigo-600">Saved Jobs</a>
                        <button onClick={() => {
                            localStorage.removeItem('token')
                            window.location.href = '/'
                        }} className="text-gray-600 hover:text-indigo-600">
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <SearchBar onSearch={handleSearch} />

                {loading ? (
                    <div className="text-center py-8">Loading...</div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">No jobs found</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        {jobs.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
