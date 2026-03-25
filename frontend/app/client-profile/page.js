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
import FollowStats from '@/components/FollowStats'
import FollowNotificationBell from '@/components/FollowNotificationBell'
import { useLanguage } from '@/context/LanguageContext'
import { togoLocations } from '@/lib/togoData'

function normalizeClientProfile(rawProfile, fallbackEmail = '') {
    const firstName = rawProfile?.first_name ?? rawProfile?.firstName ?? ''
    const lastName = rawProfile?.last_name ?? rawProfile?.lastName ?? ''
    const phoneNumber = rawProfile?.phone_number ?? rawProfile?.phoneNumber ?? ''
    const email = rawProfile?.email || fallbackEmail || ''
    const profilePicture =
        rawProfile?.profile_picture
        || rawProfile?.profilePicture
        || (Array.isArray(rawProfile?.portfolio) && rawProfile.portfolio.length > 0 ? rawProfile.portfolio[0] : null)

    return {
        ...(rawProfile || {}),
        email,
        first_name: firstName,
        firstName,
        last_name: lastName,
        lastName,
        phone_number: phoneNumber,
        phoneNumber,
        location: rawProfile?.location || '',
        bio: rawProfile?.bio || '',
        profile_picture: profilePicture,
        profilePicture,
        email_verified: Boolean(rawProfile?.email_verified ?? rawProfile?.emailVerified)
    }
}

export default function ClientProfilePage() {
    const { t } = useLanguage()
    const { user, isLoading: authLoading } = useAuth({ requiredRole: 'client' })
    const [profile, setProfile] = useState(null)
    const [followerCount, setFollowerCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
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
        profilePicture: null
    })
    const [updateLoading, setUpdateLoading] = useState(false)
    const [updateError, setUpdateError] = useState(null)
    const [updateSuccess, setUpdateSuccess] = useState(false)
    const [profilePicturePreview, setProfilePicturePreview] = useState(null)

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
    const [jobFormLoading, setJobFormLoading] = useState(false)
    const [collapsedSections, setCollapsedSections] = useState({
        basicInfo: false,
        about: false,
        ratings: false,
        projects: false,
        completions: false,
        applicants: false,
        completedProjects: false
    })
    const [timeoutWarning, setTimeoutWarning] = useState(false)
    const [jobApplicants, setJobApplicants] = useState({}) // Job ID -> Array of applicants
    const [applicantsLoading, setApplicantsLoading] = useState(false)
    const [applicantsError, setApplicantsError] = useState(null)
    const [applicationOperationError, setApplicationOperationError] = useState(null)
    const [completionOperationError, setCompletionOperationError] = useState(null)
    const [showApplicants, setShowApplicants] = useState(true)
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
    const PROFILE_SAVE_TIMEOUT_MS = 120000

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

                // Show timeout warning if critical profile data is unusually slow.
                warningTimeoutId = setTimeout(() => {
                    if (isMounted) setTimeoutWarning(true)
                }, 8000)

                // Keep auth/profile bootstrap strict so user can retry quickly.
                timeoutId = setTimeout(() => {
                    if (isMounted) {
                        setLoading(false)
                        setJobsLoading(false)
                        setError('Profile took too long to load. Please refresh the page.')
                    }
                }, 15000)

                // Load full profile payload in one RPC so page data is complete at first paint.
                let payload = null
                let payloadError = null

                try {
                    const rpcResult = await Promise.race([
                        supabase.rpc('get_client_profile_payload'),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('RPC_TIMEOUT')), 7000)
                        )
                    ])
                    payload = rpcResult?.data || null
                    payloadError = rpcResult?.error || null
                } catch (rpcErr) {
                    payloadError = rpcErr
                }

                let resolvedPayload = payload
                if (payloadError) {
                    const missingEmailVerifiedColumn = /email_verified/i.test(payloadError.message || '')
                        && /does not exist/i.test(payloadError.message || '')

                    const rpcTimedOut = /RPC_TIMEOUT/i.test(payloadError.message || '')

                    if (!missingEmailVerifiedColumn && !rpcTimedOut) {
                        throw new Error(`Failed to fetch profile payload: ${payloadError.message}`)
                    }

                    // Backward-compatible fallback for databases that have not yet added users.email_verified.
                    const [profileRes, jobsRes, completionsRes] = await Promise.all([
                        supabase
                            .from('users')
                            .select('id,email,first_name,last_name,phone_number,location,bio,portfolio,profile_picture,rating,user_type,completed_jobs,created_at,updated_at')
                            .eq('id', user.id)
                            .single(),
                        supabase
                            .from('jobs')
                            .select('id,title,description,budget,location,status,category,client_id,created_at,updated_at')
                            .eq('client_id', user.id)
                            .order('created_at', { ascending: false }),
                        supabase
                            .from('completions')
                            .select('id,job_id,status,worker_id,confirmed_at,declined_at,decline_reason,created_at')
                            .eq('client_id', user.id)
                            .order('created_at', { ascending: false })
                    ])

                    if (profileRes.error) {
                        throw new Error(`Failed to fetch profile payload: ${profileRes.error.message}`)
                    }

                    if (jobsRes.error) {
                        throw new Error(`Failed to fetch profile payload: ${jobsRes.error.message}`)
                    }

                    if (completionsRes.error) {
                        throw new Error(`Failed to fetch profile payload: ${completionsRes.error.message}`)
                    }

                    // Re-query applications using actual job IDs after jobs load.
                    const jobIds = (jobsRes.data || []).map(j => j.id)
                    let applicationsData = []
                    if (jobIds.length > 0) {
                        const { data, error } = await supabase
                            .from('applications')
                            .select('id,job_id,worker_id,status,proposed_price,message,created_at,worker:worker_id(id,first_name,last_name,email,phone_number)')
                            .in('job_id', jobIds)
                            .order('created_at', { ascending: false })

                        if (error) {
                            throw new Error(`Failed to fetch profile payload: ${error.message}`)
                        }
                        applicationsData = data || []
                    }

                    resolvedPayload = {
                        profile: {
                            ...(profileRes.data || {}),
                            email_verified: false
                        },
                        jobs: jobsRes.data || [],
                        completions: completionsRes.data || [],
                        applications: applicationsData
                    }
                }

                if (!isMounted) return

                const userData = resolvedPayload?.profile
                if (!userData) {
                    throw new Error('Profile payload is missing user profile data')
                }

                let hydratedUserData = userData
                const rpcProfileMissingPicture =
                    userData?.profile_picture === undefined
                    && userData?.profilePicture === undefined

                if (rpcProfileMissingPicture) {
                    const { data: profilePictureData, error: profilePictureError } = await supabase
                        .from('users')
                        .select('profile_picture')
                        .eq('id', user.id)
                        .single()

                    if (profilePictureError) {
                        console.warn('Failed to hydrate client profile picture from users table:', profilePictureError.message)
                    } else if (profilePictureData) {
                        hydratedUserData = {
                            ...userData,
                            profile_picture: profilePictureData.profile_picture || null
                        }
                    }
                }

                const normalizedUserData = normalizeClientProfile(hydratedUserData, user?.email)

                const jobsData = Array.isArray(resolvedPayload?.jobs) ? resolvedPayload.jobs : []
                const completionsData = Array.isArray(resolvedPayload?.completions) ? resolvedPayload.completions : []
                const applicationsData = Array.isArray(resolvedPayload?.applications) ? resolvedPayload.applications : []

                setProfile(normalizedUserData)
                setProfilePicturePreview(normalizedUserData.profilePicture)

                setFormData({
                    firstName: normalizedUserData.firstName,
                    lastName: normalizedUserData.lastName,
                    email: normalizedUserData.email,
                    phoneNumber: normalizedUserData.phoneNumber,
                    location: normalizedUserData.location,
                    bio: normalizedUserData.bio,
                    profilePicture: normalizedUserData.profilePicture
                })

                const jobsWithCompletions = jobsData.map(job => ({
                    ...job,
                    completions: completionsData.filter(c => c.job_id === job.id)
                }))
                setJobs(jobsWithCompletions)

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

                clearTimeout(timeoutId)
                clearTimeout(warningTimeoutId)
                setLoading(false)
                setJobsLoading(false)
                setTimeoutWarning(false)
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
    }, [authLoading, user])

    // Fetch follower/following counts
    useEffect(() => {
        if (!user?.id) return

        async function fetchFollowCounts() {
            try {
                const response = await fetch(`/api/user/${user.id}`)
                if (response.ok) {
                    const data = await response.json()
                    setFollowerCount(data.follower_count || 0)
                    setFollowingCount(data.following_count || 0)
                }
            } catch (err) {
                console.error('Failed to fetch follow counts:', err)
            }
        }

        fetchFollowCounts()

        // Poll for updates every minute
        const interval = setInterval(fetchFollowCounts, 60000)
        return () => clearInterval(interval)
    }, [user?.id])

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

        const jobIds = jobs.map(job => job.id)

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
                        if (jobIds.length === 0) {
                            setJobApplicants({})
                            return
                        }

                        const { data: applicationsData } = await supabase
                            .from('applications')
                            .select(`id,job_id,worker_id,status,proposed_price,message,created_at,
                                worker:worker_id(id,first_name,last_name,email,phone_number)`)
                            .in('job_id', jobIds)
                            .order('created_at', { ascending: false })
                            .limit(200)

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
    }, [user?.id, loading, jobs])

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        })
    }

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
            if (file.size <= MAX_BYTES) {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(file)
                return
            }
            const img = new Image()
            const url = URL.createObjectURL(file)
            img.onload = () => {
                URL.revokeObjectURL(url)
                const scale = Math.sqrt(MAX_BYTES / file.size)
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(img.width * scale)
                canvas.height = Math.round(img.height * scale)
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
                let quality = 0.85
                // base64 is ~4/3 raw bytes; loop down until encoded size fits 2 MB
                let dataUrl = canvas.toDataURL('image/jpeg', quality)
                while (dataUrl.length > MAX_BYTES * 1.37 && quality > 0.1) {
                    quality = Math.max(0.1, quality - 0.15)
                    dataUrl = canvas.toDataURL('image/jpeg', quality)
                }
                resolve(dataUrl)
            }
            img.onerror = () => {
                URL.revokeObjectURL(url)
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(file)
            }
            img.src = url
        })
    }

    const handleProfilePictureChange = async (e) => {
        const file = e.target.files?.[0]
        if (file) {
            const dataUrl = await compressImage(file)
            setProfilePicturePreview(dataUrl)
            setFormData(prev => ({
                ...prev,
                profilePicture: dataUrl
            }))
        }
    }

    const handleJobInputChange = (e) => {
        const { name, value } = e.target
        setJobFormData({
            ...jobFormData,
            [name]: value
        })
    }

    const toggleSection = (section) => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }))
    }

    const handleJobSubmit = async (e) => {
        e.preventDefault()
        setJobFormError(null)
        setJobFormSuccess(false)

        // Validation
        if (!jobFormData.title?.trim()) {
            setJobFormError('Project title is required')
            return
        }
        if (!jobFormData.description?.trim()) {
            setJobFormError('Project description is required')
            return
        }
        if (!jobFormData.location?.trim()) {
            setJobFormError('Location is required')
            return
        }
        if (!jobFormData.jobType?.trim()) {
            setJobFormError('Project type/category is required')
            return
        }
        if (!jobFormData.salary || jobFormData.salary === '') {
            setJobFormError('Budget is required')
            return
        }

        setJobFormLoading(true)

        try {
            const jobPayload = {
                title: jobFormData.title.trim(),
                description: jobFormData.description.trim(),
                budget: parseFloat(jobFormData.salary),
                location: jobFormData.location.trim(),
                category: jobFormData.jobType.trim(),
                client_id: user.id,
                status: 'open'
            }

            // Set timeout for database operation (3 seconds)
            const JOB_SAVE_TIMEOUT = 3000
            let timeoutId

            const savePromise = new Promise(async (resolve, reject) => {
                try {
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
                            .insert([jobPayload])
                            .select()
                            .single()

                        if (error) throw error
                        setJobs([data, ...jobs])
                    }
                    resolve()
                } catch (err) {
                    reject(err)
                }
            })

            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error('TIMEOUT'))
                }, JOB_SAVE_TIMEOUT)
            })

            await Promise.race([savePromise, timeoutPromise])
            clearTimeout(timeoutId)

            setJobFormData({ title: '', description: '', location: '', jobType: '', salary: '' })
            setShowJobModal(false)
            setJobFormSuccess(true)
            const id = setTimeout(() => setJobFormSuccess(false), 3000)
            timeoutsRef.current.push(id)
        } catch (err) {
            console.error('Failed to save job', err)

            // Specific error messages
            let errorMessage = 'Failed to save project. Please try again.'

            if (err.message === 'TIMEOUT') {
                errorMessage = 'Project save took too long (over 3 seconds). This usually means:\n\n' +
                    '1. Your internet connection is slow or unstable\n' +
                    '2. The server is experiencing high traffic\n' +
                    '3. Your data quota is exceeded\n\n' +
                    'Please check your connection and try again. If the problem persists, contact support.'
            } else if (err.message?.includes('unique')) {
                errorMessage = 'A project with this title already exists. Please use a different title.'
            } else if (err.message?.includes('permission')) {
                errorMessage = 'You do not have permission to create projects. Please verify your account status.'
            } else if (err.message?.includes('connection') || err.message?.includes('ECONNREFUSED')) {
                errorMessage = 'Connection failed. Please check your internet connection and try again.'
            } else if (err.message?.includes('budget') || err.message?.includes('salary')) {
                errorMessage = 'The budget value is invalid. Please enter a valid number.'
            } else {
                // Fallback to actual error if available
                errorMessage = err.message || 'Failed to save project. Please try again.'
            }

            setJobFormError(errorMessage)
        } finally {
            setJobFormLoading(false)
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
            setApplicationOperationError(null)

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
            setApplicationOperationError(`Failed to ${newStatus} application: ${err.message}`)
            const id = setTimeout(() => setApplicationOperationError(null), 5000)
            timeoutsRef.current.push(id)
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
            const currentProfilePicture = profile?.profile_picture || profile?.profilePicture || null
            const nextProfilePicture = formData.profilePicture || null
            const hasProfilePictureChanged = nextProfilePicture !== currentProfilePicture

            const updatePayload = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone_number: formData.phoneNumber,
                location: formData.location,
                bio: formData.bio
            }

            if (hasProfilePictureChanged) {
                updatePayload.profile_picture = nextProfilePicture
            }

            const saveController = new AbortController()
            let saveTimeoutId

            const saveRequest = supabase
                .from('users')
                .update(updatePayload)
                .eq('id', user.id)
                .abortSignal(saveController.signal)

            const { error } = await Promise.race([
                saveRequest,
                new Promise((_, reject) => {
                    saveTimeoutId = setTimeout(() => {
                        saveController.abort()
                        reject(new Error('SAVE_TIMEOUT'))
                    }, PROFILE_SAVE_TIMEOUT_MS)
                })
            ])

            clearTimeout(saveTimeoutId)

            if (error) throw error

            const updatedUser = {
                ...(profile || {}),
                ...updatePayload,
                profile_picture: hasProfilePictureChanged ? nextProfilePicture : currentProfilePicture
            }

            const normalizedUpdatedUser = normalizeClientProfile(updatedUser, profile?.email || user?.email)
            setProfile(normalizedUpdatedUser)
            setProfilePicturePreview(normalizedUpdatedUser.profilePicture)
            setIsEditing(false)
            setUpdateSuccess(true)
            const id = setTimeout(() => setUpdateSuccess(false), 3000)
            timeoutsRef.current.push(id)
        } catch (err) {
            console.error('Failed to update profile', err)
            if (err?.name === 'AbortError' || /SAVE_TIMEOUT/i.test(err?.message || '')) {
                setUpdateError('Profile save is taking too long. Please check your connection and try again.')
            } else {
                setUpdateError(err.message || 'Failed to update profile')
            }
        } finally {
            setUpdateLoading(false)
        }
    }

    const handleVerifyEmail = async (e) => {
        e.preventDefault()
        setVerifyingEmail(true)
        setEmailVerificationError('')
        try {
            const { data: { session }, error } = await supabase.auth.getSession()
            if (error) throw error

            if (!session?.user?.email_confirmed_at) {
                setEmailVerificationError('Email not verified yet. Please click the link in your verification email first.')
                return
            }

            const { error: syncError } = await supabase
                .from('users')
                .update({ email_verified: true })
                .eq('id', user.id)

            if (syncError) throw syncError

            setProfile(prev => ({ ...prev, email_verified: true }))
            setUpdateSuccess(true)
            const id = setTimeout(() => setUpdateSuccess(false), 3000)
            timeoutsRef.current.push(id)
        } catch (err) {
            setEmailVerificationError(err.message || 'Verification status check failed')
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
            setEmailVerificationError(err.message || 'Failed to resend verification email')
        } finally {
            setEmailResendLoading(false)
        }
    }

    const handleConfirmCompletion = async (completionId) => {
        try {
            setProcessingCompletionId(completionId)
            setCompletionOperationError(null)
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
            console.error('Completion confirmation failed:', err)
            const errorMsg = err.message || 'Failed to confirm completion'
            setCompletionOperationError(errorMsg)
            setUpdateError(errorMsg)
            const id2 = setTimeout(() => {
                setCompletionOperationError(null)
                setUpdateError(null)
            }, 5000)
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
                {/* Main Error Alert */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3 flex-1">
                                <h3 className="text-sm font-medium text-red-800">{t('error') || 'Error'}</h3>
                                <p className="text-sm text-red-700 mt-2">{error}</p>
                            </div>
                            <button
                                onClick={() => setError(null)}
                                className="ml-3 text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Timeout Warning Alert */}
                {timeoutWarning && !error && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3 flex-1">
                                <h3 className="text-sm font-medium text-yellow-800">{t('loadingTakingLong') || 'Taking longer than expected'}</h3>
                                <p className="text-sm text-yellow-700 mt-2">The page is taking longer to load. Please wait or refresh the page.</p>
                            </div>
                            <button
                                onClick={() => setTimeoutWarning(false)}
                                className="ml-3 text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="bg-white shadow rounded-lg p-8 mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{t('yourClientProfile')}</h1>
                            <p className="text-gray-600 mt-1">{t('manageInformation')}</p>
                        </div>
                        {!isEditing && (
                            <div className="flex items-center gap-3">
                                <FollowNotificationBell userId={user?.id} />
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                                >
                                    {t('editProfile')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Follow Stats */}
                    <FollowStats
                        followerCount={followerCount}
                        followingCount={followingCount}
                        isOwnProfile={true}
                    />

                    {updateSuccess && (
                        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3 flex-1">
                                    <p className="text-sm text-green-800">{t('profileUpdatedSuccess')}</p>
                                </div>
                                <button
                                    onClick={() => setUpdateSuccess(false)}
                                    className="ml-3 text-green-600 hover:text-green-800 text-sm font-medium"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )}

                    {updateError && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r mb-4">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3 flex-1">
                                    <h3 className="text-sm font-medium text-red-800">{t('profileUpdateFailed') || 'Failed to update profile'}</h3>
                                    <p className="text-sm text-red-700 mt-2">{updateError}</p>
                                </div>
                                <button
                                    onClick={() => setUpdateError(null)}
                                    className="ml-3 text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Email Verification Section */}
                    {profile && !profile.email_verified && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r">
                            <div className="flex items-start">
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-yellow-800 mb-2">{t('verifyYourEmail')}</h3>
                                    <p className="text-sm text-yellow-700 mb-4">
                                        Verification is link-based. Open the verification email sent to {profile.email}, click the link, then use the button below to refresh your status.
                                    </p>
                                    <form onSubmit={handleVerifyEmail} className="flex gap-2 mb-3">
                                        <button
                                            type="submit"
                                            disabled={verifyingEmail}
                                            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
                                        >
                                            {verifyingEmail ? 'Checking...' : 'I clicked the verification link'}
                                        </button>
                                    </form>
                                    {emailVerificationError && (
                                        <div className="text-sm text-red-600 mb-3 p-2 bg-red-50 rounded border border-red-200">
                                            {emailVerificationError}
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
                                    {profilePicturePreview || profile?.profile_picture || profile?.profilePicture ? (
                                        <img
                                            src={profilePicturePreview || profile?.profile_picture || profile?.profilePicture}
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
                        <div className="bg-white shadow rounded-lg">
                            <button
                                onClick={() => toggleSection('basicInfo')}
                                className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition"
                            >
                                <h2 className="text-xl font-semibold">{t('basicInformation')}</h2>
                                <span className="text-2xl text-gray-600">
                                    {collapsedSections.basicInfo ? '▶' : '▼'}
                                </span>
                            </button>
                            {!collapsedSections.basicInfo && (
                                <div className="px-8 pb-6 pt-2 border-t">
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
                            )}
                        </div>
                        <div className="bg-white shadow rounded-lg">
                            <button
                                onClick={() => toggleSection('about')}
                                className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition"
                            >
                                <h2 className="text-xl font-semibold">{t('aboutMe')}</h2>
                                <span className="text-2xl text-gray-600">
                                    {collapsedSections.about ? '▶' : '▼'}
                                </span>
                            </button>
                            {!collapsedSections.about && (
                                <div className="px-8 pb-6 pt-2 border-t">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">{t('skillsYouNeed')}</label>
                                        <p className="text-gray-900 mt-2 whitespace-pre-wrap">
                                            {profile?.bio || t('notProvided')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Ratings Section */}
                        <div className="bg-white shadow rounded-lg">
                            <button
                                onClick={() => toggleSection('ratings')}
                                className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition"
                            >
                                <h2 className="text-xl font-semibold">{t('yourRatingsAsClient')}</h2>
                                <span className="text-2xl text-gray-600">
                                    {collapsedSections.ratings ? '▶' : '▼'}
                                </span>
                            </button>
                            {!collapsedSections.ratings && (
                                <div className="px-8 pb-6 pt-2 border-t">
                                    <p className="text-sm text-gray-600 mb-6">
                                        {t('workersSeeyourRatings')}
                                    </p>
                                    <RatingsDisplay userId={profile?.id} />
                                </div>
                            )}
                        </div>

                        {/* Your Projects Section */}
                        <div className="bg-white shadow rounded-lg">
                            <button
                                onClick={() => toggleSection('projects')}
                                className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition"
                            >
                                <h2 className="text-xl font-semibold">{t('yourProjects')}</h2>
                                <span className="text-2xl text-gray-600">
                                    {collapsedSections.projects ? '▶' : '▼'}
                                </span>
                            </button>
                            {!collapsedSections.projects && (
                                <div className="px-8 pb-6 pt-2 border-t">
                                    <div className="flex justify-between items-center mb-6">
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
                            )}
                        </div>

                        {/* Completion Requests Section */}
                        <div className="bg-white shadow rounded-lg">
                            <button
                                onClick={() => toggleSection('completions')}
                                className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition"
                            >
                                <h2 className="text-xl font-semibold">{t('activeProjectsCompletion')}</h2>
                                <span className="text-2xl text-gray-600">
                                    {collapsedSections.completions ? '▶' : '▼'}
                                </span>
                            </button>
                            {!collapsedSections.completions && (
                                <div className="px-8 pb-6 pt-2 border-t">
                                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r mb-4">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <h3 className="text-sm font-medium text-red-800">Completion operation failed</h3>
                                                <p className="text-sm text-red-700 mt-2">{completionOperationError}</p>
                                            </div>
                                            <button
                                                onClick={() => setCompletionOperationError(null)}
                                                className="ml-3 text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>

                                    {completionOperationError && (
                                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r mb-4">
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3 flex-1">
                                                    <h3 className="text-sm font-medium text-red-800">Completion operation failed</h3>
                                                    <p className="text-sm text-red-700 mt-2">{completionOperationError}</p>
                                                </div>
                                                <button
                                                    onClick={() => setCompletionOperationError(null)}
                                                    className="ml-3 text-red-600 hover:text-red-800 text-sm font-medium"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    )}

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
                            )}
                        </div>

                        {/* Job Applicants Section */}
                        <div className="bg-white shadow rounded-lg">
                            <button
                                onClick={() => toggleSection('applicants')}
                                className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition"
                            >
                                <h2 className="text-xl font-semibold">{t('projectApplicants')}</h2>
                                <span className="text-2xl text-gray-600">
                                    {collapsedSections.applicants ? '▶' : '▼'}
                                </span>
                            </button>
                            {!collapsedSections.applicants && (
                                <div className="px-8 pb-6 pt-2 border-t">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-semibold">{t('projectApplicants')}</h2>
                                        <button
                                            onClick={() => setShowApplicants(!showApplicants)}
                                            className="text-sm text-gray-600 hover:text-gray-900"
                                        >
                                            {showApplicants ? t('hideBtn') : t('showBtn')}
                                        </button>
                                    </div>

                                    {applicationOperationError && (
                                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r mb-4">
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3 flex-1">
                                                    <h3 className="text-sm font-medium text-red-800">Application operation failed</h3>
                                                    <p className="text-sm text-red-700 mt-2">{applicationOperationError}</p>
                                                </div>
                                                <button
                                                    onClick={() => setApplicationOperationError(null)}
                                                    className="ml-3 text-red-600 hover:text-red-800 text-sm font-medium"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {showApplicants && (
                                        <>
                                            {applicantsLoading ? (
                                                <div className="text-center py-12">{t('loadingApplicants')}</div>
                                            ) : applicantsError ? (
                                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r">
                                                    <div className="flex items-start">
                                                        <div className="flex-shrink-0">
                                                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                        <div className="ml-3 flex-1">
                                                            <h3 className="text-sm font-medium text-yellow-800">Failed to load applicants</h3>
                                                            <p className="text-sm text-yellow-700 mt-2">{applicantsError}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => setApplicantsError(null)}
                                                            className="ml-3 text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
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
                            )}
                        </div>

                        {/* Completed Projects Section */}
                        <div className="bg-white shadow rounded-lg">
                            <button
                                onClick={() => toggleSection('completedProjects')}
                                className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition"
                            >
                                <h2 className="text-xl font-semibold">{t('completedJobs')}</h2>
                                <span className="text-2xl text-gray-600">
                                    {collapsedSections.completedProjects ? '▶' : '▼'}
                                </span>
                            </button>
                            {!collapsedSections.completedProjects && (
                                <div className="px-8 pb-6 pt-2 border-t">

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
                                                                <p className="text-sm text-gray-900 mt-1">{completion.confirmed_at ? new Date(completion.confirmed_at).toLocaleDateString() : t('notYet')}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
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
                                    {profilePicturePreview || profile?.profile_picture || profile?.profilePicture ? (
                                        <img
                                            src={profilePicturePreview || profile?.profile_picture || profile?.profilePicture}
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
                                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <h3 className="text-sm font-medium text-red-800">{editingJobId ? 'Failed to update project' : 'Failed to post project'}</h3>
                                                <p className="text-sm text-red-700 mt-2">{jobFormError}</p>
                                            </div>
                                            <button
                                                onClick={() => setJobFormError(null)}
                                                type="button"
                                                className="ml-3 text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {jobFormSuccess && (
                                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <h3 className="text-sm font-medium text-green-800">{editingJobId ? 'Project updated' : 'Project posted'}</h3>
                                                <p className="text-sm text-green-700 mt-2">Project {editingJobId ? 'updated' : 'posted'} successfully!</p>
                                            </div>
                                            <button
                                                onClick={() => setJobFormSuccess(false)}
                                                type="button"
                                                className="ml-3 text-green-600 hover:text-green-800 text-sm font-medium"
                                            >
                                                ✕
                                            </button>
                                        </div>
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
                                        disabled={jobFormLoading}
                                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {jobFormLoading ? 'Posting...' : editingJobId ? 'Update Project' : 'Post Project'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={jobFormLoading}
                                        onClick={() => setShowJobModal(false)}
                                        className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition font-medium flex-1 disabled:opacity-50"
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
