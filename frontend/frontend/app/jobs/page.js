'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { buildBilingualQuery } from '@/lib/bilingualSearch'
import JobCard from '@/components/JobCard'
import JobCardSkeleton from '@/components/JobCardSkeleton'
import SearchBar from '@/components/SearchBar'
import { useLanguage } from '@/context/LanguageContext'

function JobsPageContent() {
    const PAGE_SIZE = 24
    const router = useRouter()
    const searchParams = useSearchParams()
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [page, setPage] = useState(1)
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
        fetchJobs(activeFilters, 1, false)
        didMountRef.current = true
    }, [])

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

    const fetchJobs = async (searchFilters = activeFilters, nextPage = 1, append = false) => {
        try {
            if (append) {
                setLoadingMore(true)
            } else {
                setLoading(true)
            }

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
                .order('created_at', { ascending: false })

            if (searchFilters.keyword) {
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

            const start = (nextPage - 1) * PAGE_SIZE
            const end = start + PAGE_SIZE - 1

            const { data: jobsData, error } = await query.range(start, end)

            if (error) {
                throw error
            }

            const safeJobs = jobsData || []
            setJobs(prev => (append ? [...prev, ...safeJobs] : safeJobs))
            setHasMore(safeJobs.length === PAGE_SIZE)
            setPage(nextPage)
        } catch (err) {
            console.error(t('failedToFetchJobs'), err)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const handleSearch = async (searchFilters) => {
        try {
            setActiveFilters(searchFilters)
            await fetchJobs(searchFilters, 1, false)
        } catch (err) {
            console.error(t('searchFailed'), err)
        }
    }

    const handleLoadMore = async () => {
        if (!hasMore || loading || loadingMore) return
        await fetchJobs(activeFilters, page + 1, true)
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
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                            {jobs.map((job) => (
                                <JobCard key={job.id} job={job} />
                            ))}
                        </div>
                        {hasMore && (
                            <div className="mt-8 flex justify-center">
                                <button
                                    type="button"
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-60"
                                >
                                    {loadingMore ? t('loading') : t('loadMore')}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default function JobsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen py-8 sm:py-10" />}>
            <JobsPageContent />
        </Suspense>
    )
}
