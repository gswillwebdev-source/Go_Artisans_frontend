'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import JobCard from '@/components/JobCard'
import { useLanguage } from '@/context/LanguageContext'

export default function SavedJobsPage() {
    const { t } = useLanguage()
    const [savedJobs, setSavedJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    useEffect(() => {
        const fetchSavedJobs = async () => {
            try {
                // Check if user is authenticated
                const { data: { user }, error: authError } = await supabase.auth.getUser()

                if (authError || !user) {
                    setIsLoggedIn(false)
                    setLoading(false)
                    return
                }

                setIsLoggedIn(true)

                const { data, error: fetchError } = await supabase
                    .from('saved_jobs')
                    .select('created_at,job:job_id(id,title,description,budget,location,status,client_id,created_at,category)')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                if (fetchError) throw fetchError
                setSavedJobs((data || []).map(row => row.job).filter(Boolean))
            } catch (err) {
                console.error('Error fetching saved jobs:', err)
                setError(t('failedLoadSavedJobs'))
            } finally {
                setLoading(false)
            }
        }

        fetchSavedJobs()
    }, [])

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="glass-surface rounded-2xl text-center py-12 border border-white/80">
                        <p className="text-slate-600 mb-4">{t('pleaseLoginToViewSavedJobs')}</p>
                        <Link href="/login" className="text-blue-700 hover:underline font-semibold">{t('logInCta')} →</Link>
                    </div>
                </div>
            </div>
        )
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-600 font-semibold">{t('loading')}</div>

    return (
        <div className="min-h-screen py-8 sm:py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 fade-in-up">
                    <h2 className="display-font text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{t('savedJobsTitle')}</h2>
                    <p className="text-slate-600 mt-2">{t('savedJobsSubtitle')}</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl mb-4">
                        {error}
                    </div>
                )}

                {savedJobs.length === 0 ? (
                    <div className="glass-surface rounded-2xl text-center py-12 border border-white/80">
                        <p className="text-slate-600 mb-4">{t('noSavedJobsYet')}</p>
                        <Link href="/jobs" className="text-blue-700 hover:underline font-semibold">{t('browseJobsCta')} →</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedJobs.map((job) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                isSaved={true}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
