'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { buildBilingualQuery } from '@/lib/bilingualSearch'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/context/LanguageContext'
import WorkerCard from '@/components/WorkerCard'
import WorkerSearchBar from '@/components/WorkerSearchBar'
import UserCardSkeleton from '@/components/UserCardSkeleton'

export default function BrowseWorkersPage() {
    const PAGE_SIZE = 24
    const { t } = useLanguage()
    const { user, isLoading: authLoading } = useAuth()
    const [workers, setWorkers] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [page, setPage] = useState(1)
    const [filters, setFilters] = useState({
        keyword: '',
        location: '',
        jobType: '',
    })

    useEffect(() => {
        if (!authLoading) {
            fetchWorkers()
        }
    }, [authLoading])

    const fetchWorkers = async (searchFilters = filters, nextPage = 1, append = false) => {
        try {
            if (append) {
                setLoadingMore(true)
            } else {
                setLoading(true)
            }

            let query = supabase
                .from('users')
                .select('id,first_name,last_name,email,phone_number,job_title,location,bio,years_experience,profile_picture,rating,is_active')
                .eq('user_type', 'worker')
                .eq('is_active', true)

            if (searchFilters.keyword) {
                const bilingualOr = buildBilingualQuery(searchFilters.keyword, ['job_title', 'bio'])
                if (bilingualOr) {
                    query = query.or(bilingualOr)
                }
            }
            if (searchFilters.location) {
                query = query.ilike('location', `%${searchFilters.location}%`)
            }

            const start = (nextPage - 1) * PAGE_SIZE
            const end = start + PAGE_SIZE - 1

            const { data: workersData, error } = await query
                .order('id', { ascending: false })
                .range(start, end)

            if (error) throw error

            const safeWorkers = workersData || []
            setWorkers(prev => (append ? [...prev, ...safeWorkers] : safeWorkers))
            setHasMore(safeWorkers.length === PAGE_SIZE)
            setPage(nextPage)
        } catch (err) {
            console.error('Failed to fetch workers:', err)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const handleSearch = async (searchFilters) => {
        try {
            setFilters(searchFilters)
            await fetchWorkers(searchFilters, 1, false)
        } catch (err) {
            console.error('Search failed:', err)
        }
    }

    const handleLoadMore = async () => {
        if (!hasMore || loading || loadingMore) return
        await fetchWorkers(filters, page + 1, true)
    }

    return (
        <div className="min-h-screen py-8 sm:py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 fade-in-up">
                    <h1 className="display-font text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{t('browseWorkersTitle')}</h1>
                    <p className="text-slate-600 mt-2">{t('browseWorkersSubtitle')}</p>
                </div>

                <WorkerSearchBar onSearch={handleSearch} />

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <UserCardSkeleton key={`worker-skeleton-${index}`} />
                        ))}
                    </div>
                ) : workers.length === 0 ? (
                    <div className="glass-surface rounded-2xl p-10 text-center text-slate-600 mt-6">{t('noWorkersFound')}</div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                            {workers.map((worker) => (
                                <WorkerCard key={worker.id} worker={worker} />
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
