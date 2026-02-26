'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import WorkerCard from '@/components/WorkerCard'
import WorkerSearchBar from '@/components/WorkerSearchBar'

export default function BrowseWorkersPage() {
    const [workers, setWorkers] = useState([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        keyword: '',
        location: '',
        jobType: '',
    })
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [userType, setUserType] = useState(null)

    useEffect(() => {
        // Check auth state
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null

        setIsLoggedIn(!!token)

        if (userData) {
            try {
                const user = JSON.parse(userData)
                setUserType(user.userType)
            } catch (e) {
                console.error('Failed to parse user data:', e)
            }
        }

        fetchWorkers()
    }, [])

    const fetchWorkers = async () => {
        try {
            setLoading(true)
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/users/search/workers`)
            setWorkers(response.data.workers)
        } catch (err) {
            console.error('Failed to fetch workers:', err)
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
                `${process.env.NEXT_PUBLIC_API_URL}/api/users/search/workers?${params.toString()}`
            )
            setWorkers(response.data.workers)
        } catch (err) {
            console.error('Search failed:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <WorkerSearchBar onSearch={handleSearch} />

                {loading ? (
                    <div className="text-center py-8">Loading...</div>
                ) : workers.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">No workers found matching your criteria</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        {workers.map((worker) => (
                            <WorkerCard key={worker.id} worker={worker} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
