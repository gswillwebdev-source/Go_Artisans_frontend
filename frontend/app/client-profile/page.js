'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import completionClient from '@/lib/completionClient'
import RatingModal from '@/components/RatingModal'
import DeclineReasonModal from '@/components/DeclineReasonModal'
import RatingsDisplay from '@/components/RatingsDisplay'
import CompletionRequest from '@/components/CompletionRequest'
import { useLanguage } from '@/context/LanguageContext'
import { togoLocations, handworks } from '@/lib/togoData'

export default function ClientProfilePage() {
    const { t } = useLanguage()
    const { user, isLoading: authLoading } = useAuth({ requiredRole: 'client' })
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        location: '',
        bio: '',
        profilePicture: null,
        portfolio: []
    })
    const [updateLoading, setUpdateLoading] = useState(false)
    const [updateError, setUpdateError] = useState(null)
    const [updateSuccess, setUpdateSuccess] = useState(false)
    const [profilePicturePreview, setProfilePicturePreview] = useState(null)
    const [portfolioFiles, setPortfolioFiles] = useState([])
    const [newPortfolioImages, setNewPortfolioImages] = useState([])

    // Job posting states
    const [jobs, setJobs] = useState([])
    const [jobsLoading, setJobsLoading] = useState(false)
    const [showJobModal, setShowJobModal] = useState(false)
    const [jobFormData, setJobFormData] = useState({
        title: '',
        description: '',
        location: '',
        jobType: '',
        salary: ''
    })
    const [jobFormError, setJobFormError] = useState(null)
    const [jobFormSuccess, setJobFormSuccess] = useState(false)
    const [editingJobId, setEditingJobId] = useState(null)
    const [timeoutWarning, setTimeoutWarning] = useState(false)
    const [jobApplicants, setJobApplicants] = useState({}) // Job ID -> Array of applicants
    const [applicantsLoading, setApplicantsLoading] = useState(false)
    const [applicantsError, setApplicantsError] = useState(null)
    const [showApplicants, setShowApplicants] = useState(true)
    const [emailVerificationCode, setEmailVerificationCode] = useState('')
    const [verifyingEmail, setVerifyingEmail] = useState(false)
    const [emailVerificationError, setEmailVerificationError] = useState('')
    const [emailResendLoading, setEmailResendLoading] = useState(false)
    const [emailResendCooldown, setEmailResendCooldown] = useState(0)
    const [showRatingModal, setShowRatingModal] = useState(false)
    const [ratingCompletionId, setRatingCompletionId] = useState(null)
    const [showDeclineModal, setShowDeclineModal] = useState(false)
    const [declineCompletionId, setDeclineCompletionId] = useState(null)
    const [updatingAppId, setUpdatingAppId] = useState(null)
    const [processingCompletionId, setProcessingCompletionId] = useState(null)
    const timeoutsRef = useRef([])

    // Cleanup all timeouts on unmount
    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach(id => clearTimeout(id))
        }
    }, [])

    useEffect(() => {
        if (authLoading) return

        if (!user) {
            // useAuth will handle redirect
            return
        }

        let isMounted = true
        let timeoutId
        let warningTimeoutId

        async function fetchData() {
            try {
                setLoading(true)
                setJobsLoading(true)
                setError(null)
                setTimeoutWarning(false)

                // Show timeout warning after 20 seconds
                warningTimeoutId = setTimeout(() => {
                    if (isMounted) setTimeoutWarning(true)
                }, 20000)

                // Main timeout after 30 seconds
                timeoutId = setTimeout(() => {
                    if (isMounted) {
                        setLoading(false)
                        setJobsLoading(false)
                        setError('Profile took too long to load. Please refresh the page.')
                    }
                }, 30000)

                // Fetch all data in parallel for fast loading
                const results = await Promise.allSettled([
                    // Profile information
                    supabase
                        .from('users')
                        .select('id,email,first_name,last_name,phone_number,location,bio,portfolio,rating,user_type,completed_jobs')
                        .eq('id', user.id)
                        .single(),

                    // Jobs posted by this client
                    supabase
                        .from('jobs')
                        .select('id,title,description,budget,location,status,category,client_id,created_at,updated_at')
                        .eq('client_id', user.id)
                        .order('created_at', { ascending: false }),

                    // Completions for client's jobs
                    supabase
                        .from('completions')
                        .select('id,job_id,status,worker_id,confirmed_at,declined_at,decline_reason,created_at')
                        .eq('client_id', user.id)
                        .order('created_at', { ascending: false }),

                    // Ratings received from workers
                    supabase
                        .from('reviews')
                        .select('id,rating,comment,created_at,rater_type,worker_id')
                        .eq('client_id', user.id)
                        .eq('rater_type', 'worker')
                        .order('created_at', { ascending: false }),

                    // Applications for client's jobs (with worker details)
                    supabase
                        .from('applications')
                        .select(`id,job_id,worker_id,status,proposed_price,message,created_at,
                            worker:worker_id(id,first_name,last_name,email,phone_number)`)
                        .order('created_at', { ascending: false })
                        .limit(100)
                ])

                clearTimeout(timeoutId)
                clearTimeout(warningTimeoutId)

                if (!isMounted) return

                // Extract individual results from Promise.allSettled
                let profileRes = { data: null, error: null }
                let jobsRes = { data: null, error: null }
                let completionsRes = { data: null, error: null }
                let ratingsRes = { data: null, error: null }
                let applicantsRes = { data: null, error: null }

                if (results[0].status === 'fulfilled') {
                    profileRes = results[0].value
                } else {
                    profileRes.error = results[0].reason
                }

                if (results[1].status === 'fulfilled') {
                    jobsRes = results[1].value
                } else {
                    jobsRes.error = results[1].reason
                }

                if (results[2].status === 'fulfilled') {
                    completionsRes = results[2].value
                } else {
                    completionsRes.error = results[2].reason
                }

                if (results[3].status === 'fulfilled') {
                    ratingsRes = results[3].value
                } else {
                    ratingsRes.error = results[3].reason
                }

                if (results[4].status === 'fulfilled') {
                    applicantsRes = results[4].value
                } else {
                    applicantsRes.error = results[4].reason
                }

                // Log any query errors for debugging
                if (profileRes.error) console.error('Profile fetch error:', profileRes.error)
                if (jobsRes.error) console.error('Jobs fetch error:', jobsRes.error)
                if (completionsRes.error) console.error('Completions fetch error:', completionsRes.error)
                if (ratingsRes.error) console.error('Ratings fetch error:', ratingsRes.error)
                if (applicantsRes.error) console.error('Applicants fetch error:', applicantsRes.error)

                // Handle profile data (required)
                if (profileRes.error) throw new Error(`Failed to fetch profile: ${profileRes.error.message}`)

                const userData = profileRes.data
                setProfile(userData)
                if (userData.portfolio && userData.portfolio.length > 0) {
                    setProfilePicturePreview(userData.portfolio[0])
                }

                // Parse portfolio/gallery if it's a JSON string
                let portfolioData = userData.portfolio || []
                if (typeof portfolioData === 'string') {
                    try {
                        portfolioData = JSON.parse(portfolioData)
                    } catch (e) {
                        portfolioData = []
                    }
                }

                setFormData({
                    firstName: userData.first_name || '',
                    lastName: userData.last_name || '',
                    email: userData.email || '',
                    phoneNumber: userData.phone_number || '',
                    location: userData.location || '',
                    bio: userData.bio || '',
                    profilePicture: userData.portfolio && userData.portfolio.length > 0 ? userData.portfolio[0] : null,
                    portfolio: portfolioData
                })

                // Handle jobs data (optional) - match with completions
                const jobsData = (jobsRes.data && !jobsRes.error) ? jobsRes.data : []
                const completionsData = (completionsRes.data && !completionsRes.error) ? completionsRes.data : []

                // Attach completions to jobs
                const jobsWithCompletions = jobsData.map(job => ({
                    ...job,
                    completions: completionsData.filter(c => c.job_id === job.id)
                }))

                setJobs(jobsWithCompletions)

                // Handle ratings data (optional)
                const ratingsData = (ratingsRes.data && !ratingsRes.error) ? ratingsRes.data : []
                // Ratings are handled by the RatingsDisplay component

                // Handle applicants data (optional)
                const applicantsMap = {}
                if (applicantsRes.data && !applicantsRes.error) {
                    applicantsRes.data.forEach(application => {
                        if (!applicantsMap[application.job_id]) {
                            applicantsMap[application.job_id] = []
                        }
                        // Flatten worker details for easier access
                        applicantsMap[application.job_id].push({
                            ...application,
                            first_name: application.worker?.first_name,
                            last_name: application.worker?.last_name,
                            email: application.worker?.email,
                            phone_number: application.worker?.phone_number
                        })
                    })
                }
                setJobApplicants(applicantsMap)
            } catch (err) {
                clearTimeout(timeoutId)
                clearTimeout(warningTimeoutId)

                if (!isMounted) return

                console.error('Failed to fetch data:', err)
                console.error('Error details:', {
                    message: err.message,
                    code: err.code,
                    status: err.status,
                    details: err.details
                })

                let errorMessage = 'Failed to load profile'
                if (err.code === 'ECONNABORTED') {
                    errorMessage = 'Request timeout. The server is not responding. Please check your connection.'
                } else if (err.message === 'Network Error') {
                    errorMessage = 'Network error. Please check your internet connection.'
                } else if (err.message) {
                    errorMessage = err.message
                }

                setError(errorMessage)
                setTimeoutWarning(false)
            } finally {
                if (isMounted) {
                    setLoading(false)
                    setJobsLoading(false)
                }
            }
        }

        fetchData()

        return () => {
            isMounted = false
            clearTimeout(timeoutId)
            clearTimeout(warningTimeoutId)
        }
    }, [authLoading, user, t])

    // Handle email resend cooldown timer
    useEffect(() => {
        if (emailResendCooldown > 0) {
            const timer = setTimeout(() => {
                setEmailResendCooldown(emailResendCooldown - 1)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [emailResendCooldown])

    // Real-time subscription for completions
    useEffect(() => {
        if (!user?.id || loading) return

        // Subscribe to completions changes for this client
        const completionsSubscription = supabase
            .channel(`completions-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'completions',
                    filter: `client_id=eq.${user.id}`
                },
                async (payload) => {
                    // When a completion changes, refresh jobs with completions
                    try {
                        const { data: jobsData } = await supabase
                            .from('jobs')
                            .select('id,title,description,budget,location,status,category,client_id,created_at,updated_at')
                            .eq('client_id', user.id)
                            .order('created_at', { ascending: false })

                        const { data: completionsData } = await supabase
                            .from('completions')
                            .select('id,job_id,status,worker_id,confirmed_at,declined_at,decline_reason,created_at')
                            .eq('client_id', user.id)
                            .order('created_at', { ascending: false })

                        if (jobsData && completionsData) {
                            const jobsWithCompletions = jobsData.map(job => ({
                                ...job,
                                completions: completionsData.filter(c => c.job_id === job.id)
                            }))
                            setJobs(jobsWithCompletions)
                        }
                    } catch (err) {
                        console.error('Error refreshing completions:', err)
                    }
                }
            )
            .subscribe()

        return () => {
            completionsSubscription?.unsubscribe()
        }
    }, [user?.id, loading])

    // Real-time subscription for job applicants
    useEffect(() => {
        if (!user?.id || loading) return

        // Subscribe to application changes
        const applicationsSubscription = supabase
            .channel(`applications-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'applications'
                },
                async (payload) => {
                    // When applications change, refresh applicants
                    try {
                        const { data: applicationsData } = await supabase
                            .from('applications')
                            .select(`id,job_id,worker_id,status,proposed_price,message,created_at,
                                worker:worker_id(id,first_name,last_name,email,phone_number)`)
                            .order('created_at', { ascending: false })
                            .limit(100)

                        if (applicationsData) {
                            const applicantsMap = {}
                            applicationsData.forEach(application => {
                                if (!applicantsMap[application.job_id]) {
                                    applicantsMap[application.job_id] = []
                                }
                                applicantsMap[application.job_id].push({
                                    ...application,
                                    first_name: application.worker?.first_name,
                                    last_name: application.worker?.last_name,
                                    email: application.worker?.email,
                                    phone_number: application.worker?.phone_number
                                })
                            })
                            setJobApplicants(applicantsMap)
                        }
                    } catch (err) {
                        console.error('Error refreshing applications:', err)
                    }
                }
            )
            .subscribe()

        return () => {
            applicationsSubscription?.unsubscribe()
        }
    }, [user?.id, loading])

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        })
    }

    const handleProfilePictureChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setProfilePicturePreview(reader.result)
                setFormData({
                    ...formData,
                    profilePicture: reader.result
                })
            }
            reader.readAsDataURL(file)
        }
    }

    const handlePortfolioChange = (e) => {
        const files = Array.from(e.target.files || [])

        files.forEach(file => {
            const reader = new FileReader()
            reader.onloadend = () => {
                const dataUrl = reader.result
                setFormData(prev => ({
                    ...prev,
                    portfolio: [...prev.portfolio, dataUrl]
                }))
                setNewPortfolioImages(prev => [...prev, {
                    name: file.name,
                    url: dataUrl,
                    file: file
                }])
            }
            reader.readAsDataURL(file)
        })
    }

    const handleRemovePortfolio = (idx) => {
        setFormData({
            ...formData,
            portfolio: formData.portfolio.filter((_, i) => i !== idx)
        })
        setNewPortfolioImages(newPortfolioImages.filter((_, i) => i !== idx))
    }

    const handleJobInputChange = (e) => {
        const { name, value } = e.target
        setJobFormData({
            ...jobFormData,
            [name]: value
        })
    }

    const handleJobSubmit = async (e) => {
        e.preventDefault()
        setJobFormError(null)
        setJobFormSuccess(false)

        try {
            const jobPayload = {
                title: jobFormData.title,
                description: jobFormData.description,
                budget: jobFormData.salary,
                location: jobFormData.location,
                category: jobFormData.jobType,
                client_id: user.id
            }

            if (editingJobId) {
                // Update existing job
                const { data, error } = await supabase
                    .from('jobs')
                    .update(jobPayload)
                    .eq('id', editingJobId)
                    .select()
                    .single()

                if (error) throw error

                setJobs(jobs.map(j => j.id === editingJobId ? data : j))
                setEditingJobId(null)
            } else {
                // Create new job
                const { data, error } = await supabase
                    .from('jobs')
                    .insert(jobPayload)
                    .select()
                    .single()

                if (error) throw error

                setJobs([data, ...jobs])
            }

            setJobFormData({ title: '', description: '', location: '', jobType: '', salary: '' })
            setShowJobModal(false)
            setJobFormSuccess(true)
            const id = setTimeout(() => setJobFormSuccess(false), 3000)
            timeoutsRef.current.push(id)
        } catch (err) {
            console.error('Failed to save job', err)
            setJobFormError(err.message || 'Failed to save job')
        }
    }

    const handleEditJob = (job) => {
        setJobFormData({
            title: job.title,
            description: job.description,
            location: job.location,
            jobType: job.category,
            salary: job.budget
        })
        setEditingJobId(job.id)
        setShowJobModal(true)
    }

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this project?')) return

        try {
            const { error } = await supabase
                .from('jobs')
                .delete()
                .eq('id', jobId)

            if (error) throw error

            setJobs(jobs.filter(j => j.id !== jobId))
        } catch (err) {
            console.error('Failed to delete job', err)
            alert('Failed to delete project')
        }
    }

    const handleUpdateApplicationStatus = async (appId, newStatus) => {
        try {
            setUpdatingAppId(appId)

            const { error } = await supabase
                .from('applications')
                .update({ status: newStatus })
                .eq('id', appId)

            if (error) throw error

            // Update the applicants state
            const updatedApplicants = { ...jobApplicants }
            for (const jobId in updatedApplicants) {
                updatedApplicants[jobId] = updatedApplicants[jobId].map(app =>
                    app.id === appId ? { ...app, status: newStatus } : app
                )
            }
            setJobApplicants(updatedApplicants)
        } catch (err) {
            console.error('Failed to update application status', err)
            alert(`Failed to ${newStatus} application: ${err.message}`)
        } finally {
            setUpdatingAppId(null)
        }
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        setUpdateLoading(true)
        setUpdateError(null)
        setUpdateSuccess(false)

        try {
            // Portfolio data is already in the correct format (data URLs or strings)
            const portfolioData = formData.portfolio.filter(p => p && typeof p === 'string')

            const updatePayload = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone_number: formData.phoneNumber,
                location: formData.location,
                bio: formData.bio,
                portfolio: portfolioData
            }

            const { data, error } = await supabase
                .from('users')
                .update(updatePayload)
                .eq('id', user.id)
                .select()
                .single()

            if (error) throw error

            const updatedUser = data
            setProfile(updatedUser)
            if (updatedUser.portfolio && updatedUser.portfolio.length > 0) {
                setProfilePicturePreview(updatedUser.portfolio[0])
            }
            setIsEditing(false)
            setUpdateSuccess(true)
            const id = setTimeout(() => setUpdateSuccess(false), 3000)
            timeoutsRef.current.push(id)
        } catch (err) {
            console.error('Failed to update profile', err)
            setUpdateError(err.message || 'Failed to update profile')
        } finally {
            setUpdateLoading(false)
        }
    }

    const handleVerifyEmail = async (e) => {
        e.preventDefault()
        setVerifyingEmail(true)
        setEmailVerificationError('')
        try {
            // Email verification is handled by Supabase via email links
            // This function is kept for compatibility but not used
            setEmailVerificationError('Email verification is handled automatically via the link sent to your email.')
        } catch (err) {
            setEmailVerificationError(err.message || 'Verification not available')
        } finally {
            setVerifyingEmail(false)
        }
    }

    const handleResendVerificationEmail = async () => {
        setEmailResendLoading(true)
        setEmailVerificationError('')
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: user.email
            })

            if (error) throw error

            setUpdateSuccess(true)
            setEmailResendCooldown(60)
            const id = setTimeout(() => setUpdateSuccess(false), 3000)
            timeoutsRef.current.push(id)
        } catch (err) {
            setEmailVerificationError(err.message || 'Failed to resend verification code')
        } finally {
            setEmailResendLoading(false)
        }
    }

    const handleConfirmCompletion = async (completionId) => {
        try {
            setProcessingCompletionId(completionId)
            await completionClient.confirmCompletion(completionId)
            // Find the job by searching through jobs with this completion
            const job = jobs.find(j => j.completions && j.completions.some(c => c.id === completionId))
            if (job) {
                // Update the jobs state with the new completion status
                const updatedCompletions = job.completions.map(c =>
                    c.id === completionId ? { ...c, status: 'confirmed' } : c
                )
                setJobs(prev => prev.map(j => j.id === job.id ? { ...j, completions: updatedCompletions } : j))
            }
            setRatingCompletionId(completionId)
            setShowRatingModal(true)
            setUpdateSuccess(true)
            const id1 = setTimeout(() => setUpdateSuccess(false), 3000)
            timeoutsRef.current.push(id1)
        } catch (err) {
            setUpdateError(err.message || 'Failed to confirm completion')
            const id2 = setTimeout(() => setUpdateError(null), 3000)
            timeoutsRef.current.push(id2)
        } finally {
            setProcessingCompletionId(null)
        }
    }

    const handleDeclineSubmit = async () => {
        // Find the job by searching through jobs with this completion
        const job = jobs.find(j => j.completions && j.completions.some(c => c.id === declineCompletionId))
        if (job && declineCompletionId) {
            try {
                // Fetch the updated completion data with decline reason from database
                const { data: updatedCompletion, error } = await supabase
                    .from('completions')
                    .select('id,job_id,status,worker_id,confirmed_at,declined_at,decline_reason,created_at')
                    .eq('id', declineCompletionId)
                    .single()

                if (error) throw error

                // Update the jobs state with the updated completion data
                const updatedCompletions = job.completions.map(c =>
                    c.id === declineCompletionId ? updatedCompletion : c
                )
                setJobs(prev => prev.map(j => j.id === job.id ? { ...j, completions: updatedCompletions } : j))
            } catch (err) {
                console.error('Failed to refresh completion status:', err)
            }
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="inline-block mb-4">
                    <div className="animate-spin h-12 w-12 border-b-2 border-indigo-600 rounded-full"></div>
                </div>
                <p className="text-gray-600 text-lg mb-2">Loading your profile...</p>
                <p className="text-gray-500 text-sm">This may take a few moments</p>
                {timeoutWarning && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
                        <p className="text-yellow-800 font-semibold">Still loading...</p>
                        <p className="text-yellow-700 text-sm mt-1">If this takes longer, your connection might be slow. Waiting up to 30 seconds.</p>
                    </div>
                )}
            </div>
        </div>
    )
    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
                <div className="mb-4 text-red-600">
                    <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-red-600 text-lg font-semibold mb-2">Something went wrong</p>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                    Try Again
                </button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white shadow rounded-lg p-8 mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{t('yourClientProfile')}</h1>
                            <p className="text-gray-600 mt-1">{t('manageInformation')}</p>
                        </div>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                            >
                                {t('editProfile')}
                            </button>
                        )}
                    </div>

                    {updateSuccess && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4">
                            {t('profileUpdatedSuccess')}
                        </div>
                    )}

                    {updateError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
                            {updateError}
                        </div>
                    )}

                    {/* Email Verification Section */}
                    {profile && !profile.email_verified && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r">
                            <div className="flex items-start">
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-yellow-800 mb-2">{t('verifyYourEmail')}</h3>
                                    <p className="text-sm text-yellow-700 mb-4">
                                        {t('verifySixDigitCode').replace('{{email}}', profile.email)}
                                    </p>
                                    <form onSubmit={handleVerifyEmail} className="flex gap-2 mb-3">
                                        <label htmlFor="email-verification-code" className="sr-only">Verification Code</label>
                                        <input
                                            id="email-verification-code"
                                            name="verification-code"
                                            type="text"
                                            value={emailVerificationCode}
                                            onChange={(e) => setEmailVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000000"
                                            maxLength="6"
                                            className="w-32 px-3 py-2 border border-yellow-300 rounded text-center text-lg tracking-widest font-mono"
                                            required
                                            aria-label="Email verification code"
                                        />
                                        <button
                                            type="submit"
                                            disabled={verifyingEmail || emailVerificationCode.length !== 6}
                                            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
                                        >
                                            {verifyingEmail ? t('verifying') : t('verifyButton')}
                                        </button>
                                    </form>
                                    {emailVerificationError && (
                                        <div className="text-sm text-red-600 mb-3 p-2 bg-red-50 rounded border border-red-200">
                                            ❌ {emailVerificationError}
                                            {(emailVerificationError.toLowerCase().includes('expired') || emailVerificationError.toLowerCase().includes('invalid')) && (
                                                <div className="mt-2 pt-2 border-t border-red-200">
                                                    <button
                                                        onClick={handleResendVerificationEmail}
                                                        disabled={emailResendLoading || emailResendCooldown > 0}
                                                        className="text-red-700 hover:text-red-800 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {emailResendCooldown > 0 ? t('getNewCode').includes('{{') ? t('getNewCode') : `${t('getNewCode')}` : emailResendLoading ? t('sendingCode') : t('getNewCode')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={handleResendVerificationEmail}
                                        disabled={emailResendLoading || emailResendCooldown > 0}
                                        className="text-sm text-yellow-700 hover:text-yellow-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {emailResendCooldown > 0 ? `${t('resendCodeIn').replace('{{seconds}}', emailResendCooldown)}` : emailResendLoading ? t('sendingCode') : t('didntReceiveCode')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {!isEditing ? (
                    // View Mode
                    <div className="space-y-6">
                        {/* Profile Picture Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 bg-indigo-200 rounded-full flex items-center justify-center text-4xl overflow-hidden flex-shrink-0">
                                    {profilePicturePreview || profile?.profilePicture ? (
                                        <img
                                            src={profilePicturePreview || profile?.profilePicture}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        '👤'
                                    )}
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {profile?.first_name} {profile?.last_name}
                                    </p>
                                    <p className="text-gray-600 text-sm mt-1">{profile?.location || t('notProvided')}</p>
                                    <p className="text-sm text-gray-500 mt-2">{t('memberSince').replace('{{date}}', new Date(profile?.created_at).toLocaleDateString())}</p>
                                </div>
                            </div>
                        </div>

                        {/* Basic Information Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">{t('basicInformation')}</h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">{t('firstName')}</label>
                                    <p className="text-gray-900 mt-1">{profile?.first_name || t('notProvided')}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">{t('lastName')}</label>
                                    <p className="text-gray-900 mt-1">{profile?.last_name || t('notProvided')}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">{t('email')}</label>
                                    <p className="text-gray-900 mt-1">{profile?.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">{t('phoneNumber')}</label>
                                    <p className="text-gray-900 mt-1">{profile?.phone_number || t('notProvided')}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">{t('location')}</label>
                                    <p className="text-gray-900 mt-1">{profile?.location || t('notProvided')}</p>
                                </div>
                            </div>
                        </div>

                        {/* About Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">{t('aboutMe')}</h2>
                            <div>
                                <label className="text-sm font-medium text-gray-700">{t('skillsYouNeed')}</label>
                                <p className="text-gray-900 mt-2 whitespace-pre-wrap">
                                    {profile?.bio || t('notProvided')}
                                </p>
                            </div>
                        </div>

                        {/* Portfolio/Gallery Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">{t('portfolio')}</h2>
                            <div className="grid grid-cols-3 gap-4">
                                {(profile?.portfolio || []).length === 0 ? (
                                    <span className="text-gray-500">{t('noPortfolioImages')}</span>
                                ) : (
                                    (profile?.portfolio || []).map((img, idx) => {
                                        // Handle both array of strings and array of objects
                                        const imageUrl = typeof img === 'string' ? img : (img?.url || img?.name || '')
                                        const isValidImage = imageUrl && (imageUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(imageUrl))

                                        return (
                                            <div key={idx} className="bg-gray-100 h-40 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                                                {isValidImage ? (
                                                    <img src={imageUrl} alt={t('portfolio')} className="w-full h-full object-cover" onError={(e) => {
                                                        e.target.style.display = 'none'
                                                        e.target.nextSibling.style.display = 'flex'
                                                    }} />
                                                ) : null}
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm text-center p-2 bg-gray-50" style={{ display: isValidImage ? 'none' : 'flex' }}>
                                                    {t('noImage')}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Ratings Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">{t('yourRatingsAsClient')}</h2>
                            <p className="text-sm text-gray-600 mb-6">
                                {t('workersSeeyourRatings')}
                            </p>
                            <RatingsDisplay userId={profile?.id} />
                        </div>

                        {/* Your Projects Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold">{t('yourProjects')}</h2>
                                <button
                                    onClick={() => {
                                        setEditingJobId(null)
                                        setJobFormData({ title: '', description: '', location: '', jobType: '', salary: '' })
                                        setShowJobModal(true)
                                    }}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
                                >
                                    {t('postNewProject')}
                                </button>
                            </div>

                            {jobsLoading ? (
                                <div className="text-center py-12">{t('loadingProjects')}</div>
                            ) : jobs.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-4">📋</div>
                                    <p className="text-gray-600">{t('noProjectsPosted')}</p>
                                    <p className="text-sm text-gray-500 mt-2">{t('startPostingProject')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {jobs.map(job => (
                                        <div key={job.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                                                    <p className="text-sm text-gray-600 mt-1">{job.location}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditJob(job)}
                                                        className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-100 transition"
                                                    >
                                                        {t('editProfile')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteJob(job.id)}
                                                        className="bg-red-50 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-100 transition"
                                                    >
                                                        {t('delete')}
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-gray-700 mt-3">{job.description}</p>
                                            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-200">
                                                <div>
                                                    <span className="text-xs font-medium text-gray-600 uppercase">{t('type')}</span>
                                                    <p className="text-sm text-gray-900 mt-1">{job.category || t('notSpecified')}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-gray-600 uppercase">{t('hiringRate')}</span>
                                                    <p className="text-sm text-gray-900 mt-1 font-semibold">{job.budget || t('negotiable')}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-gray-600 uppercase">{t('posted')}</span>
                                                    <p className="text-sm text-gray-900 mt-1">{new Date(job.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Completion Requests Section */}
                        <div className="bg-white shadow rounded-lg p-4 sm:p-8 mb-8">
                            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">{t('activeProjectsCompletion')}</h2>

                            {jobs.filter(job => job.completions && job.completions.length > 0).length === 0 ? (
                                <div className="text-center py-8 sm:py-12">
                                    <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🔄</div>
                                    <p className="text-gray-600 text-sm sm:text-base">{t('noActiveProjectsCompletion')}</p>
                                </div>
                            ) : (
                                <div className="space-y-3 sm:space-y-4">
                                    {jobs.filter(job => job.completions && job.completions.length > 0).map(job => {
                                        const completion = job.completions[0]
                                        return (
                                            <CompletionRequest
                                                key={completion.id}
                                                job={job}
                                                completion={completion}
                                                onConfirm={handleConfirmCompletion}
                                                onDecline={() => {
                                                    setDeclineCompletionId(completion.id)
                                                    setShowDeclineModal(true)
                                                }}
                                                isProcessing={processingCompletionId === completion.id}
                                            />
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Job Applicants Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold">{t('projectApplicants')}</h2>
                                <button
                                    onClick={() => setShowApplicants(!showApplicants)}
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                >
                                    {showApplicants ? t('hideBtn') : t('showBtn')}
                                </button>
                            </div>

                            {showApplicants && (
                                <>
                                    {applicantsLoading ? (
                                        <div className="text-center py-12">{t('loadingApplicants')}</div>
                                    ) : applicantsError ? (
                                        <div className="bg-yellow-50 text-yellow-600 p-3 rounded mb-4">
                                            {applicantsError}
                                        </div>
                                    ) : Object.keys(jobApplicants).length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="text-4xl mb-4">👥</div>
                                            <p className="text-gray-600">{t('noApplicantsYet')}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {jobs.map(job => {
                                                const applicants = jobApplicants[job.id] || []
                                                if (applicants.length === 0) return null

                                                return (
                                                    <div key={job.id} className="border border-gray-200 rounded-lg p-6">
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{job.title}</h3>
                                                        <div className="space-y-3">
                                                            {applicants.map(applicant => (
                                                                <div key={applicant.id} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-b-0 gap-4">
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-gray-900">
                                                                            {applicant.first_name} {applicant.last_name}
                                                                        </p>
                                                                        <div className="flex gap-4 text-sm text-gray-600 mt-1 flex-wrap">
                                                                            <span>📧 {applicant.email}</span>
                                                                            {applicant.phone_number && <span>📱 {applicant.phone_number}</span>}
                                                                        </div>
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                            {t('applied')}: {new Date(applicant.created_at).toLocaleDateString()}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex flex-col items-end gap-2">
                                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${applicant.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                                            applicant.status === 'declined' ? 'bg-red-100 text-red-800' :
                                                                                applicant.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                                                    'bg-yellow-100 text-yellow-800'
                                                                            }`}>
                                                                            {applicant.status}
                                                                        </span>
                                                                        <div className="flex gap-1">
                                                                            <Link
                                                                                href={`/workers/${applicant.worker_id}`}
                                                                                className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-100 transition"
                                                                            >
                                                                                {t('viewProfile')}
                                                                            </Link>
                                                                            {applicant.phone_number && (
                                                                                <a
                                                                                    href={`https://wa.me/${applicant.phone_number.replace(/\D/g, '')}?text=Hello%20${applicant.first_name},%20I%20reviewed%20your%20application.`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs hover:bg-green-100 transition"
                                                                                >
                                                                                    WhatsApp
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                        {applicant.status === 'pending' && (
                                                                            <div className="flex gap-1">
                                                                                <button
                                                                                    onClick={() => handleUpdateApplicationStatus(applicant.id, 'accepted')}
                                                                                    disabled={updatingAppId === applicant.id}
                                                                                    className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs hover:bg-green-100 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                >
                                                                                    {updatingAppId === applicant.id ? '⏳' : '✓'} {t('acceptApplicant')}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleUpdateApplicationStatus(applicant.id, 'declined')}
                                                                                    disabled={updatingAppId === applicant.id}
                                                                                    className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs hover:bg-red-100 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                >
                                                                                    {updatingAppId === applicant.id ? '⏳' : '✕'} {t('rejectApplicant')}
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Completed Projects Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">{t('completedJobs')}</h2>

                            {jobs.filter(job => job.completions && job.completions.length > 0 && job.completions[0].status === 'confirmed').length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-4">🏆</div>
                                    <p className="text-gray-600">{t('noCompletedProjects')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {jobs.filter(job => job.completions && job.completions.length > 0 && job.completions[0].status === 'confirmed').map(job => {
                                        const completion = job.completions[0]
                                        return (
                                            <div key={job.id} className="border border-gray-200 rounded-lg p-6 bg-green-50">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                                                        <p className="text-sm text-gray-600 mt-1">{job.location}</p>
                                                    </div>
                                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                        ✓ {t('completed')}
                                                    </span>
                                                </div>
                                                <p className="text-gray-700 mt-3">{job.description}</p>
                                                <div className="flex gap-6 mt-4 pt-4 border-t border-gray-200">
                                                    <div>
                                                        <span className="text-xs font-medium text-gray-600 uppercase">{t('finalPrice')}</span>
                                                        <p className="text-sm text-gray-900 mt-1 font-semibold">CFA {completion.final_price || job.budget}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-medium text-gray-600 uppercase">{t('completedOn')}</span>
                                                        <p className="text-sm text-gray-900 mt-1">{new Date(completion.completion_date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // Edit Mode
                    <form onSubmit={handleUpdate} className="space-y-6">
                        {/* Edit Profile Picture Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">{t('profilePicture')}</h2>
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 bg-indigo-200 rounded-full flex items-center justify-center text-4xl overflow-hidden">
                                    {profilePicturePreview || profile?.profilePicture ? (
                                        <img
                                            src={profilePicturePreview || profile?.profilePicture}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        '👤'
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('uploadPhoto')}</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleProfilePictureChange}
                                        className="block text-sm text-gray-500 border border-gray-300 rounded px-3 py-2"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">{t('uploadPhotoHint')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Edit Basic Information Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">{t('basicInformation')}</h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('firstName')}</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('lastName')}</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('email')}</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('phoneNumber')}</label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        placeholder="+228 XXXX XXXX"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('location')}</label>
                                    <select
                                        name="location"
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                    >
                                        <option value="">Select a location...</option>
                                        {togoLocations.map(loc => (
                                            <option key={loc.value} value={loc.value}>{loc.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Edit About Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">{t('aboutMe')}</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('skillsYouNeed')}</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    rows="4"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                    placeholder="Describe the skills and services you're looking for. Example: I need a web developer to build an ecommerce site, a designer for logos, etc."
                                />
                                <p className="text-xs text-gray-500 mt-2">{t('helpServiceProviders')}</p>
                            </div>
                        </div>

                        {/* Edit Portfolio Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">{t('portfolio')}</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('uploadClearPhotosLabel')}</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handlePortfolioChange}
                                    className="block text-sm text-gray-500 border border-gray-300 rounded px-3 py-2"
                                />
                                <p className="text-xs text-gray-500 mt-2">{t('uploadQualityHint')}</p>
                            </div>

                            {/* Portfolio Preview */}
                            {formData.portfolio.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-sm font-medium text-gray-700 mb-3">Portfolio Images</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {formData.portfolio.map((img, idx) => (
                                            <div key={idx} className="relative bg-gray-100 h-32 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                                                <img src={img} alt={`Portfolio ${idx + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePortfolio(idx)}
                                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Form Actions */}
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={updateLoading}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
                            >
                                {updateLoading ? 'Saving...' : t('saveChanges')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition font-medium"
                            >
                                {t('cancel')}
                            </button>
                        </div>
                    </form>
                )}

                {/* Job Modal */}
                {showJobModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                                <h2 className="text-2xl font-semibold">{editingJobId ? 'Edit Project' : 'Post New Project'}</h2>
                                <button
                                    onClick={() => setShowJobModal(false)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleJobSubmit} className="p-6 space-y-6">
                                {jobFormError && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-lg">
                                        {jobFormError}
                                    </div>
                                )}

                                {jobFormSuccess && (
                                    <div className="bg-green-50 text-green-600 p-3 rounded-lg">
                                        Project {editingJobId ? 'updated' : 'posted'} successfully!
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Title *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={jobFormData.title}
                                        onChange={handleJobInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        placeholder="e.g., Build an E-commerce Website"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Description *</label>
                                    <textarea
                                        name="description"
                                        value={jobFormData.description}
                                        onChange={handleJobInputChange}
                                        required
                                        rows="5"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        placeholder="Describe what you need. Include specific requirements, timeline, and expectations."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                                        <select
                                            name="location"
                                            value={jobFormData.location}
                                            onChange={handleJobInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        >
                                            <option value="">Select a location...</option>
                                            {togoLocations.map(loc => (
                                                <option key={loc.value} value={loc.value}>{loc.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Project Type</label>
                                        <select
                                            name="jobType"
                                            value={jobFormData.jobType}
                                            onChange={handleJobInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        >
                                            <option value="">Select type...</option>
                                            <option value="one-time">One-time</option>
                                            <option value="ongoing">Ongoing</option>
                                            <option value="part-time">Part-time</option>
                                            <option value="full-time">Full-time</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Hiring Rate / Budget</label>
                                    <input
                                        type="text"
                                        name="salary"
                                        value={jobFormData.salary}
                                        onChange={handleJobInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        placeholder="e.g., $500-1000, 250,000 CFA, Negotiable"
                                    />
                                </div>

                                <div className="flex gap-3 pt-6 border-t border-gray-200">
                                    <button
                                        type="submit"
                                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium flex-1"
                                    >
                                        {editingJobId ? 'Update Project' : 'Post Project'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowJobModal(false)}
                                        className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition font-medium flex-1"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Rating Modal */}
            <RatingModal
                completionId={ratingCompletionId}
                isOpen={showRatingModal}
                onClose={() => {
                    setShowRatingModal(false)
                    setRatingCompletionId(null)
                }}
                onSuccess={() => {
                    // Refetch completion data with updated rating info
                    if (ratingCompletionId) {
                        const job = jobs.find(j => j.completions && j.completions.some(c => c.id === ratingCompletionId))
                        if (job) {
                            supabase
                                .from('completions')
                                .select('id,job_id,status,worker_id,confirmed_at,declined_at,decline_reason,created_at')
                                .eq('id', ratingCompletionId)
                                .single()
                                .then(({ data: updatedCompletion, error }) => {
                                    if (!error && updatedCompletion) {
                                        const updatedCompletions = job.completions.map(c =>
                                            c.id === ratingCompletionId ? updatedCompletion : c
                                        )
                                        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, completions: updatedCompletions } : j))
                                    }
                                })
                                .catch(err => console.error('Error refreshing rating:', err))
                        }
                    }
                    setShowRatingModal(false)
                    setRatingCompletionId(null)
                }}
                isWorker={false}
            />

            {/* Decline Reason Modal */}
            <DeclineReasonModal
                completionId={declineCompletionId}
                isOpen={showDeclineModal}
                onClose={() => {
                    setShowDeclineModal(false)
                    setDeclineCompletionId(null)
                }}
                onSuccess={handleDeclineSubmit}
            />
        </div>
    )
}
