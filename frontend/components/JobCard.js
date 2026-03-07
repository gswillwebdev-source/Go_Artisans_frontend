'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'

export default function JobCard({ job, onApplicationSuccess, onSaveToggle, isSaved: initialIsSaved = false }) {
    const [isApplying, setIsApplying] = useState(false)
    const [hasApplied, setHasApplied] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isSaved, setIsSaved] = useState(initialIsSaved)
    const [error, setError] = useState(null)
    const router = useRouter()
    const { t } = useLanguage()

    const postedDate = job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Recently'

    const handleApply = async () => {
        try {
            setIsApplying(true)
            setError(null)

            // Get current user
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/register?redirect=/jobs/' + job.id)
                return
            }

            // Insert application directly into Supabase
            const { data, error: insertError } = await supabase
                .from('applications')
                .insert([{
                    job_id: job.id,
                    worker_id: user.id,
                    status: 'pending'
                }])
                .select()

            if (insertError) {
                if (insertError.message?.includes('duplicate') || insertError.message?.includes('UNIQUE')) {
                    setHasApplied(true)
                    setError(t('alreadyApplied'))
                } else {
                    throw insertError
                }
            } else {
                setHasApplied(true)
                if (onApplicationSuccess) {
                    onApplicationSuccess()
                }
            }
        } catch (err) {
            setError(err.message || t('applicationFailed'))
        } finally {
            setIsApplying(false)
        }
    }

    const handleSaveToggle = async () => {
        try {
            setIsSaving(true)
            setError(null)

            // Get current user
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/register?redirect=/jobs/' + job.id)
                return
            }

            // Note: Save/unsave functionality requires a 'saved_jobs' table
            // For now, we'll show a message that this feature needs implementation
            setError('Save job feature coming soon!')
        } catch (err) {
            setError(err.message || t('saveFailed'))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{job.description?.substring(0, 100)}...</p>

            <div className="space-y-2 mb-4">
                <div className="flex items-center text-gray-600 text-sm">
                    <span className="font-medium">📍</span>
                    <span className="ml-2">{job.location}</span>
                </div>
                <div className="flex items-center text-gray-600 text-sm">
                    <span className="font-medium">💼</span>
                    <span className="ml-2">{job.job_type}</span>
                </div>
                {job.salary && (
                    <div className="flex items-center text-gray-600 text-sm">
                        <span className="font-medium">💰</span>
                        <span className="ml-2">CFA {job.salary}</span>
                    </div>
                )}
                <div className="flex items-center text-gray-500 text-xs">
                    <span className="font-medium">📅</span>
                    <span className="ml-2">{t('posted')}: {postedDate}</span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 text-xs p-2 rounded mb-3">
                    {error}
                </div>
            )}

            <div className="flex gap-2">
                <Link href={`/jobs/${job.id}`} className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 text-center font-medium text-sm">
                    {t('viewDetails')}
                </Link>
                <button
                    onClick={handleApply}
                    disabled={isApplying || hasApplied}
                    className={`px-4 py-2 rounded font-medium text-sm transition ${hasApplied
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                        }`}
                >
                    {isApplying ? t('applying') : hasApplied ? t('applied') : t('applyNow')}
                </button>
                <button
                    onClick={handleSaveToggle}
                    disabled={isSaving}
                    className={`px-4 py-2 rounded font-medium text-sm transition ${isSaved
                        ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                    title={isSaved ? 'Remove from saved jobs' : 'Save job'}
                >
                    {isSaving ? '⏳' : isSaved ? '⭐' : '☆'}
                </button>
            </div>
        </div>
    )
}
