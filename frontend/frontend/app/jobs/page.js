'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import JobCard from '@/components/JobCard'
import SearchBar from '@/components/SearchBar'
import { useLanguage } from '@/context/LanguageContext'

export default function JobsPage() {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const { t } = useLanguage()
    const [filters, setFilters] = useState({
        keyword: '',
        location: '',
        jobType: '',
    })
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    useEffect(() => {
        // Check login state using Supabase
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setIsLoggedIn(!!session)
        }

        checkAuth()
        fetchJobs()
    }, [])

    const fetchJobs = async () => {
        try {
            setLoading(true)
            const { data: jobsData, error } = await supabase
                .from('jobs')
                .select(`
                    id,
                    title,
                    description,
                    budget,
                    location,
                    category,
                    status,
                    created_at,
                    client:client_id (
                        id,
                        first_name,
                        last_name
                    )
                `)
                .eq('status', 'active')
                .order('created_at', { ascending: false })

            if (error) {
                throw error
            }

            setJobs(jobsData || [])
        } catch (err) {
            console.error(t('failedToFetchJobs'), err)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async (searchFilters) => {
        try {
            setLoading(true)

            let query = supabase
                .from('jobs')
                .select(`
                    id,
                    title,
                    description,
                    budget,
                    location,
                    category,
                    status,
                    created_at,
                    client:client_id (
                        id,
                        first_name,
                        last_name
                    )
                `)
                .eq('status', 'active')

            // Apply filters
            if (searchFilters.keyword) {
                query = query.or(`title.ilike.%${searchFilters.keyword}%,description.ilike.%${searchFilters.keyword}%`)
            }
            if (searchFilters.location) {
                query = query.ilike('location', `%${searchFilters.location}%`)
            }
            if (searchFilters.jobType) {
                query = query.eq('category', searchFilters.jobType)
            }

            const { data: jobsData, error } = await query.order('created_at', { ascending: false })

            if (error) {
                throw error
            }

            setJobs(jobsData || [])
        } catch (err) {
            console.error(t('searchFailed'), err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <SearchBar onSearch={handleSearch} />

                {loading ? (
                    <div className="text-center py-8">{t('loading')}</div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">{t('noJobsFound')}</div>
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
