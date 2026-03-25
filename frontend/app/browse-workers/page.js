'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/context/LanguageContext'
import WorkerCard from '@/components/WorkerCard'
import WorkerSearchBar from '@/components/WorkerSearchBar'

export default function BrowseWorkersPage() {
    const { t } = useLanguage()
    const { user, isLoading: authLoading } = useAuth()
    const [workers, setWorkers] = useState([])
    const [loading, setLoading] = useState(true)
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

    const fetchWorkers = async () => {
        try {
            setLoading(true)
            const { data: workersData, error } = await supabase
                .from('users')
                .select('id,first_name,last_name,email,phone_number,job_title,location,bio,years_experience,profile_picture,rating,is_active')
                .eq('user_type', 'worker')
                .eq('is_active', true)

            if (error) throw error

            setWorkers(workersData || [])
        } catch (err) {
            console.error('Failed to fetch workers:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async (searchFilters) => {
        try {
            setLoading(true)
            let query = supabase
                .from('users')
                .select('id,first_name,last_name,email,phone_number,job_title,location,bio,years_experience,profile_picture,rating,is_active')
                .eq('user_type', 'worker')
                .eq('is_active', true)

            if (searchFilters.keyword) {
                query = query.or(`job_title.ilike.%${searchFilters.keyword}%,bio.ilike.%${searchFilters.keyword}%`)
            }
            if (searchFilters.location) {
                query = query.ilike('location', `%${searchFilters.location}%`)
            }

            const { data, error } = await query

            if (error) throw error
            setWorkers(data || [])
        } catch (err) {
            console.error('Search failed:', err)
        } finally {
            setLoading(false)
        }
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
                    <div className="text-center py-8 text-slate-600 font-semibold">{t('loading')}</div>
                ) : workers.length === 0 ? (
                    <div className="glass-surface rounded-2xl p-10 text-center text-slate-600 mt-6">{t('noWorkersFound')}</div>
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
