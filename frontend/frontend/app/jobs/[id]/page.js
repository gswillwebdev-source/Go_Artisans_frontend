'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'

export default function JobDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { t } = useLanguage()
    const [job, setJob] = useState(null)
    const [client, setClient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [applying, setApplying] = useState(false)
    const [user, setUser] = useState(null)
    const [error, setError] = useState(null)
    const [appliedAlready, setAppliedAlready] = useState(false)

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setUser(session?.user || null)
        }
        checkAuth()
    }, [])

    useEffect(() => {
        if (params?.id) {
            fetchJob()
        }
    }, [params?.id, user])

    const fetchJob = async () => {
        try {
            setLoading(true)
            setError(null)

            // Fetch job with client info
            const { data: jobData, error: jobError } = await supabase
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
                        last_name,
                        email,
                        phone_number,
                        location,
                        rating,
                        completed_jobs
                    )
                `)
                .eq('id', params.id)
                .single()

            if (jobError) throw jobError
            if (!jobData) {
                setError(`${t('jobNotFound')}`)
                setJob(null)
                setClient(null)
                return
            }

            setJob(jobData)
            setClient(jobData.client)

            // Check if user has already applied
            if (user) {
                const { data: existingApplication } = await supabase
                    .from('applications')
                    .select('id')
                    .eq('job_id', params.id)
                    .eq('worker_id', user.id)
                    .single()

                setAppliedAlready(!!existingApplication)
            }
        } catch (err) {
            console.error('Failed to fetch job:', err)
            setError(`${t('failedToFetchJobs')}`)
        } finally {
            setLoading(false)
        }
    }

    const handleApply = async () => {
        if (!user) {
            router.push(`/login?redirect=/jobs/${params.id}`)
            return
        }

        if (appliedAlready) {
            setError('You have already applied for this job')
            return
        }

        try {
            setApplying(true)
            setError(null)

            const { error: applicationError } = await supabase
                .from('applications')
                .insert({
                    job_id: params.id,
                    worker_id: user.id,
                    status: 'pending',
                    created_at: new Date().toISOString()
                })

            if (applicationError) throw applicationError

            setAppliedAlready(true)
            alert(`${t('applicationSubmitted')}`)
            router.push('/worker-profile')
        } catch (err) {
            console.error('Failed to apply:', err)
            setError(err.message || `${t('applicationFailed')}`)
        } finally {
            setApplying(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center">{t('loading')}</div>
    if (!job) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <p className="text-red-600 font-semibold mb-4">{error || t('jobNotFound')}</p>
                <Link href="/jobs" className="text-indigo-600 hover:underline">{t('backToJobs')}</Link>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Link href="/jobs" className="text-indigo-600 hover:text-indigo-700">{t('backToJobs')}</Link>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="bg-white rounded-lg shadow p-4 sm:p-6 lg:p-8">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 break-words">{job.title}</h1>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 mt-4">
                        <div className="bg-gray-50 p-4 rounded">
                            <p className="text-sm text-gray-600">{t('location')}</p>
                            <p className="font-semibold">{job.location}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded">
                            <p className="text-sm text-gray-600">{t('jobType')}</p>
                            <p className="font-semibold">{job.category || 'General'}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded">
                            <p className="text-sm text-gray-600">{t('budget')}</p>
                            <p className="font-semibold text-indigo-600">CFA {job.budget || t('competitive')}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded">
                            <p className="text-sm text-gray-600">{t('posted')}</p>
                            <p className="font-semibold">{new Date(job.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('jobDescription')}</h2>
                        <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
                    </div>

                    {/* Client Info Section */}
                    {client && (
                        <div className="mb-8 bg-indigo-50 p-6 rounded-lg">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('aboutClient')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">{t('clientName')}</p>
                                    <p className="font-semibold text-lg">{client.first_name} {client.last_name}</p>
                                </div>
                                {client.email && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">{t('email')}</p>
                                        <p className="font-medium text-indigo-600">{client.email}</p>
                                    </div>
                                )}
                                {client.phone_number && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                                        <p className="font-medium">{client.phone_number}</p>
                                    </div>
                                )}
                                {client.location && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">{t('location')}</p>
                                        <p className="font-medium">{client.location}</p>
                                    </div>
                                )}
                                {client.rating > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">{t('rating')}</p>
                                        <p className="font-medium">⭐ {client.rating.toFixed(1)} / 5.0</p>
                                    </div>
                                )}
                                {client.completed_jobs > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">{t('jobsPosted')}</p>
                                        <p className="font-medium">{client.completed_jobs} jobs</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {!user && (
                        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-blue-700 font-medium mb-4">{t('loginToApply')}</p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => router.push('/login')}
                                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold transition"
                                >
                                    {t('login')}
                                </button>
                                <button
                                    onClick={() => router.push('/register')}
                                    className="flex-1 bg-white text-indigo-600 border border-indigo-600 py-2 rounded-lg hover:bg-indigo-50 font-semibold transition"
                                >
                                    {t('register')}
                                </button>
                            </div>
                        </div>
                    )}

                    {user && (
                        <button
                            onClick={handleApply}
                            disabled={applying || appliedAlready}
                            className={`w-full py-3 rounded-lg font-semibold text-lg transition ${appliedAlready
                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                } ${applying ? 'opacity-50' : ''}`}
                        >
                            {appliedAlready ? '✓ Already Applied' : (applying ? `${t('applying')}...` : `${t('applyNow')}`)}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
