'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useSubscription } from '@/context/SubscriptionContext'

function SavedJobCard({ job, onRemove }) {
    const { t } = useLanguage()
    const router = useRouter()
    const [isApplying, setIsApplying] = useState(false)
    const [hasApplied, setHasApplied] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)
    const [cardError, setCardError] = useState(null)

    const handleApply = async () => {
        try {
            setIsApplying(true)
            setCardError(null)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            const { error: insertError } = await supabase
                .from('applications')
                .insert([{ job_id: job.id, worker_id: user.id, status: 'pending' }])
            if (insertError) {
                if (insertError.message?.includes('duplicate') || insertError.message?.includes('UNIQUE')) {
                    setHasApplied(true)
                    setCardError(t('alreadyApplied'))
                } else {
                    throw insertError
                }
            } else {
                setHasApplied(true)
            }
        } catch (err) {
            setCardError(err.message || t('applicationFailed'))
        } finally {
            setIsApplying(false)
        }
    }

    const handleRemove = async () => {
        try {
            setIsRemoving(true)
            setCardError(null)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { error: deleteError } = await supabase
                .from('saved_jobs')
                .delete()
                .eq('job_id', job.id)
                .eq('user_id', user.id)
            if (deleteError) throw deleteError
            onRemove(job.id)
        } catch (err) {
            setCardError(err.message || t('saveFailed'))
            setIsRemoving(false)
        }
    }

    return (
        <div className="elevated-card interactive-rise rounded-2xl p-6 flex flex-col gap-4">
            <div>
                <h3 className="display-font text-xl font-bold text-slate-900 tracking-tight mb-1">{job.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                    {job.description ? job.description.substring(0, 120) + (job.description.length > 120 ? '…' : '') : t('noDescription')}
                </p>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {job.location && <span>📍 {job.location}</span>}
                {(job.budget || job.salary) && <span>💰 CFA {job.budget || job.salary}</span>}
                {job.category && <span>🏷️ {job.category}</span>}
            </div>

            {cardError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{cardError}</p>
            )}

            <div className="flex gap-2 mt-auto">
                <button
                    onClick={handleApply}
                    disabled={isApplying || hasApplied}
                    className={`flex-1 py-2 rounded-xl font-semibold text-sm transition ${hasApplied
                        ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                        : 'primary-action shadow-sm'
                        }`}
                >
                    {isApplying ? t('applying') : hasApplied ? t('applied') : t('applyNow')}
                </button>
                <button
                    onClick={handleRemove}
                    disabled={isRemoving}
                    className="flex-1 py-2 rounded-xl font-semibold text-sm border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                >
                    {isRemoving ? '⏳' : t('removeSavedJob')}
                </button>
            </div>
        </div>
    )
}

export default function SavedJobsPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const { isFree, loading: subLoading } = useSubscription()
    const [savedJobs, setSavedJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    // Redirect free users to pricing before doing anything else
    useEffect(() => {
        if (!subLoading && isFree) {
            router.replace('/pricing')
        }
    }, [isFree, subLoading, router])

    useEffect(() => {
        const fetchSavedJobs = async () => {
            try {
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

    const handleRemove = (jobId) => {
        setSavedJobs(prev => prev.filter(j => j.id !== jobId))
    }

    if (!isLoggedIn && !loading) {
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

    if (loading || subLoading) return <div className="min-h-screen flex items-center justify-center text-slate-600 font-semibold">{t('loading')}</div>

    return (
        <div className="min-h-screen py-8 sm:py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 fade-in-up flex items-center gap-4">
                    <Link href="/worker-profile" className="text-slate-500 hover:text-slate-800 text-sm font-medium">← {t('backToProfile')}</Link>
                </div>
                <div className="mb-8 fade-in-up">
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
                            <SavedJobCard
                                key={job.id}
                                job={job}
                                onRemove={handleRemove}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
