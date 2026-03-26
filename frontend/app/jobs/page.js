'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { buildBilingualQuery } from '@/lib/bilingualSearch'
import JobCard from '@/components/JobCard'
import JobCardSkeleton from '@/components/JobCardSkeleton'
import SearchBar from '@/components/SearchBar'
import { useLanguage } from '@/context/LanguageContext'

export default function JobsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const { t } = useLanguage()
    const [activeFilters, setActiveFilters] = useState({
        keyword: searchParams.get('keyword') || '',
        location: searchParams.get('location') || '',
        jobType: searchParams.get('jobType') || '',
    })
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const didMountRef = useRef(false)

    useEffect(() => {
        // Check login state using Supabase
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setIsLoggedIn(!!session)
        }

        checkAuth()
        // Initial fetch - will be overridden by search if query params exist
        if (!searchParams.get('keyword') && !searchParams.get('location') && !searchParams.get('jobType')) {
            fetchJobs()
        }
        didMountRef.current = true
    }, [])

    // Trigger search when activeFilters change from URL params
    useEffect(() => {
        if (!didMountRef.current) return

        // If any filters are set, trigger search
        if (activeFilters.keyword || activeFilters.location || activeFilters.jobType) {
            handleSearch(activeFilters)
        }
    }, [activeFilters.keyword, activeFilters.location, activeFilters.jobType])

    // Update URL when filters change
    useEffect(() => {
        if (!didMountRef.current) return

        const params = new URLSearchParams()
        if (activeFilters.keyword) params.set('keyword', activeFilters.keyword)
        if (activeFilters.location) params.set('location', activeFilters.location)
        if (activeFilters.jobType) params.set('jobType', activeFilters.jobType)
        const query = params.toString()
        router.push(query ? `/jobs?${query}` : '/jobs')
    }, [activeFilters, router])

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
            setActiveFilters(searchFilters)

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
                // Use bilingual search to match French and English job titles
                const bilingualOr = buildBilingualQuery(searchFilters.keyword, ['title', 'description'])
                if (bilingualOr) {
                    query = query.or(bilingualOr)
                }
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
        <div className="min-h-screen py-8 sm:py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 fade-in-up">
                    <h1 className="display-font text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{t('findJobsTitle')}</h1>
                    <p className="text-slate-600 mt-2">{t('findJobsSubtitle')}</p>
                </div>

                <SearchBar onSearch={handleSearch} isSearching={loading} />

                {!loading && (
                    <p className="mt-4 text-sm text-slate-600">
                        Showing {jobs.length} job{jobs.length !== 1 ? 's' : ''}
                        {activeFilters.keyword || activeFilters.location || activeFilters.jobType ? ' for your current filters.' : '.'}
                    </p>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <JobCardSkeleton key={i} />
                        ))}
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="glass-surface rounded-2xl p-10 text-center text-slate-600 mt-6">{t('noJobsFound')}</div>
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
