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
import PhoneInput from '@/components/PhoneInput'
import { useLanguage } from '@/context/LanguageContext'

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
        salary: '',
        media: []
    })
    const [jobFormError, setJobFormError] = useState(null)
    const [jobFormSuccess, setJobFormSuccess] = useState(false)
    const [editingJobId, setEditingJobId] = useState(null)
    const [jobFormLoading, setJobFormLoading] = useState(false)
    const [descriptionAutoFilled, setDescriptionAutoFilled] = useState(false)
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
                        setError(t('profileTookTooLong'))
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

                let errorMessage = t('failedLoadProfileMsg')
                if (err.code === 'ECONNABORTED') {
                    errorMessage = t('requestTimeoutMsg')
                } else if (err.message === 'Network Error') {
                    errorMessage = t('networkErrorMsg')
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
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return

            let requestTimeoutId
            try {
                const controller = new AbortController()
                requestTimeoutId = setTimeout(() => controller.abort(), 8000)
                const response = await fetch(`/api/user/${user.id}`, { signal: controller.signal })

                if (response.ok) {
                    const data = await response.json()
                    setFollowerCount(data.follower_count || 0)
                    setFollowingCount(data.following_count || 0)
                }
            } catch (err) {
                if (!/Failed to fetch|NetworkError|ERR_INTERNET_DISCONNECTED/i.test(err?.message || '')) {
                    console.error('Failed to fetch follow counts:', err)
                }
            } finally {
                clearTimeout(requestTimeoutId)
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

    // No realtime subscriptions here: profile flows use explicit fetch/write only.

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

    const MAX_JOB_MEDIA = 5
    const MAX_VIDEO_MB = 10

    const handleJobMediaChange = async (e) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return
        const remaining = MAX_JOB_MEDIA - (jobFormData.media?.length || 0)
        if (remaining <= 0) return
        const toProcess = files.slice(0, remaining)
        const results = []
        for (const file of toProcess) {
            const isVideo = file.type.startsWith('video/')
            const isImage = file.type.startsWith('image/')
            if (!isVideo && !isImage) continue
            if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
                alert(t('jobMediaVideoTooLarge').replace('{{mb}}', MAX_VIDEO_MB))
                continue
            }
            const data = await new Promise((resolve) => {
                if (isImage) {
                    compressImage(file).then(resolve)
                } else {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(reader.result)
                    reader.readAsDataURL(file)
                }
            })
            results.push({ type: isImage ? 'image' : 'video', data, name: file.name })
        }
        e.target.value = ''
        setJobFormData(prev => ({ ...prev, media: [...(prev.media || []), ...results] }))
    }

    const handleRemoveJobMedia = (index) => {
        setJobFormData(prev => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }))
    }

    const generateDescriptionFromTitle = (title) => {
        if (!title || title.length < 3) return ''
        const tl = title.toLowerCase()
        if (/plumb|plom/i.test(tl)) return t('autoDescPlumber')
        if (/electric|électric/i.test(tl)) return t('autoDescElectrician')
        if (/paint|peintr/i.test(tl)) return t('autoDescPainter')
        if (/clean|nettoy/i.test(tl)) return t('autoDescCleaner')
        if (/driv|chauffeur/i.test(tl)) return t('autoDescDriver')
        if (/carpe|menuis/i.test(tl)) return t('autoDescCarpenter')
        if (/mason|maçon|bricklay/i.test(tl)) return t('autoDescMason')
        if (/cook|chef|cuisinier/i.test(tl)) return t('autoDescCook')
        if (/guard|secur|gardien/i.test(tl)) return t('autoDescGuard')
        if (/garden|jardin/i.test(tl)) return t('autoDescGardener')
        if (/teach|tutor|prof/i.test(tl)) return t('autoDescTeacher')
        if (/web|app|software|logiciel/i.test(tl)) return t('autoDescDeveloper')
        if (/design|graphic|graphiste/i.test(tl)) return t('autoDescDesigner')
        if (/photo|video|film/i.test(tl)) return t('autoDescPhotographer')
        if (/move|transport|déménag/i.test(tl)) return t('autoDescMover')
        if (/repair|fix|réparat/i.test(tl)) return t('autoDescRepair')
        return t('autoDescGeneric').replace('{{title}}', title)
    }

    const handleJobInputChange = (e) => {
        const { name, value } = e.target
        if (name === 'title') {
            const autoDesc = generateDescriptionFromTitle(value)
            const shouldAutoFill = jobFormData.description === '' || descriptionAutoFilled
            setJobFormData(prev => ({
                ...prev,
                title: value,
                description: shouldAutoFill ? autoDesc : prev.description
            }))
            setDescriptionAutoFilled(shouldAutoFill && autoDesc.length > 0)
        } else if (name === 'description') {
            setDescriptionAutoFilled(false)
            setJobFormData(prev => ({ ...prev, description: value }))
        } else {
            setJobFormData(prev => ({ ...prev, [name]: value }))
        }
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
            setJobFormError(t('projectTitleRequired'))
            return
        }
        if (!jobFormData.description?.trim()) {
            setJobFormError(t('projectDescriptionRequired'))
            return
        }
        if (!jobFormData.location?.trim()) {
            setJobFormError(t('projectLocationRequired'))
            return
        }
        if (!jobFormData.jobType?.trim()) {
            setJobFormError(t('projectTypeRequired'))
            return
        }
        if (!jobFormData.salary || jobFormData.salary === '') {
            setJobFormError(t('projectBudgetRequired'))
            return
        }

        setJobFormLoading(true)

        try {
            const baseJobPayload = {
                title: jobFormData.title.trim(),
                description: jobFormData.description.trim(),
                budget: parseFloat(jobFormData.salary),
                location: jobFormData.location.trim(),
                category: jobFormData.jobType.trim(),
                media: jobFormData.media || []
            }

            // Set timeout for database operation (3 seconds)
            const JOB_SAVE_TIMEOUT = 3000
            let timeoutId

            const savePromise = new Promise(async (resolve, reject) => {
                try {
                    if (editingJobId) {
                        const existingJob = jobs.find(j => j.id === editingJobId)
                        const updateJobPayload = {}

                        for (const [key, nextValue] of Object.entries(baseJobPayload)) {
                            const currentValue = existingJob?.[key]
                            const next = JSON.stringify(nextValue)
                            const curr = JSON.stringify(currentValue)
                            if (next !== curr) {
                                updateJobPayload[key] = nextValue
                            }
                        }

                        if (Object.keys(updateJobPayload).length === 0) {
                            setEditingJobId(null)
                            setShowJobModal(false)
                            resolve()
                            return
                        }

                        const { data, error } = await supabase
                            .from('jobs')
                            .update(updateJobPayload)
                            .eq('id', editingJobId)
                            .select()
                            .single()

                        if (error) throw error
                        setJobs(jobs.map(j => j.id === editingJobId ? data : j))
                        setEditingJobId(null)
                    } else {
                        const createJobPayload = {
                            ...baseJobPayload,
                            client_id: user.id,
                            status: 'open'
                        }

                        // Create new job
                        const { data, error } = await supabase
                            .from('jobs')
                            .insert([createJobPayload])
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

            setJobFormData({ title: '', description: '', location: '', jobType: '', salary: '', media: [] })
            setDescriptionAutoFilled(false)
            setShowJobModal(false)
            setJobFormSuccess(true)
            const id = setTimeout(() => setJobFormSuccess(false), 3000)
            timeoutsRef.current.push(id)
        } catch (err) {
            console.error('Failed to save job', err)

            // Specific error messages
            let errorMessage = t('failedSaveProject')

            if (err.message === 'TIMEOUT') {
                errorMessage = t('projectSaveTimeout')
            } else if (err.message?.includes('unique')) {
                errorMessage = t('projectDuplicateTitle')
            } else if (err.message?.includes('permission')) {
                errorMessage = t('projectNoPermission')
            } else if (err.message?.includes('connection') || err.message?.includes('ECONNREFUSED')) {
                errorMessage = t('projectConnectionFailed')
            } else if (err.message?.includes('budget') || err.message?.includes('salary')) {
                errorMessage = t('projectBudgetInvalid')
            } else {
                // Fallback to actual error if available
                errorMessage = err.message || t('failedSaveProject')
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
            salary: job.budget,
            media: Array.isArray(job.media) ? job.media : []
        })
        setDescriptionAutoFilled(false)
        setEditingJobId(job.id)
        setShowJobModal(true)
    }

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm(t('confirmDeleteProject'))) return

        try {
            const { error } = await supabase
                .from('jobs')
                .delete()
                .eq('id', jobId)

            if (error) throw error

            setJobs(jobs.filter(j => j.id !== jobId))
        } catch (err) {
            console.error('Failed to delete job', err)
            alert(t('failedDeleteProject'))
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
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                throw new Error('NETWORK_OFFLINE')
            }

            const currentProfilePicture = profile?.profile_picture || profile?.profilePicture || null
            const nextProfilePicture = formData.profilePicture || null
            const hasProfilePictureChanged = nextProfilePicture !== currentProfilePicture

            const nextBasePayload = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone_number: formData.phoneNumber,
                location: formData.location,
                bio: formData.bio
            }

            const updatePayload = {}
            for (const [key, nextValue] of Object.entries(nextBasePayload)) {
                const currentValue = profile?.[key]
                if (nextValue === currentValue) continue
                updatePayload[key] = nextValue
            }

            if (hasProfilePictureChanged) {
                updatePayload.profile_picture = nextProfilePicture
            }

            if (Object.keys(updatePayload).length === 0) {
                setIsEditing(false)
                setUpdateSuccess(true)
                const id = setTimeout(() => setUpdateSuccess(false), 3000)
                timeoutsRef.current.push(id)
                return
            }

            const { error } = await supabase
                .from('users')
                .update(updatePayload)
                .eq('id', user.id)

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
            if (
                /NETWORK_OFFLINE|Failed to fetch|NetworkError|ERR_INTERNET_DISCONNECTED/i.test(err?.message || '')
                || err?.name === 'TypeError'
            ) {
                setUpdateError(t('networkErrorMsg') || 'Network error. Please check your connection and try again.')
            } else {
                setUpdateError(err.message || t('failedLoadProfileMsg'))
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
                setEmailVerificationError(t('emailNotVerifiedYet'))
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
            setEmailVerificationError(err.message || t('verificationStatusCheckFailed'))
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
            setEmailVerificationError(err.message || t('failedResendVerificationEmail'))
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
            const errorMsg = err.message || t('failedConfirmCompletion')
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
                <p className="text-gray-600 text-lg mb-2">{t('loadingProfile')}</p>
                <p className="text-gray-500 text-sm">{t('loadingMoments')}</p>
                {timeoutWarning && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
                        <p className="text-yellow-800 font-semibold">{t('stillLoading')}</p>
                        <p className="text-yellow-700 text-sm mt-1">{t('slowConnection')}</p>
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
                <p className="text-red-600 text-lg font-semibold mb-2">{t('somethingWentWrong')}</p>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                    {t('tryAgain')}
                </button>
            </div>
        </div>
    )

    return (
        <div className="profile-page">
            <div className="profile-container">
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
                                <p className="text-sm text-yellow-700 mt-2">{t('loadingTakingLongBody')}</p>
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
                <div className="profile-hero fade-in-up mb-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between mb-6 relative">
                        <div>
                            <span className="profile-chip mb-3">{t('clientProfile')}</span>
                            <h1 className="profile-title text-3xl sm:text-4xl font-bold text-gray-900">{t('yourClientProfile')}</h1>
                            <p className="profile-muted mt-2 max-w-2xl">{t('manageInformation')}</p>
                        </div>
                        {!isEditing && (
                            <div className="profile-actions lg:justify-end">
                                <FollowNotificationBell userId={user?.id} />
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="primary-action px-4 py-2 rounded-xl font-semibold shadow-sm"
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
                                        {t('verifyEmailLinkInstructions').replace('{{email}}', profile.email)}
                                    </p>
                                    <form onSubmit={handleVerifyEmail} className="flex gap-2 mb-3">
                                        <button
                                            type="submit"
                                            disabled={verifyingEmail}
                                            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
                                        >
                                            {verifyingEmail ? t('checkingVerification') : t('verificationLinkClicked')}
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
                        <div className="profile-section profile-section-soft">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                                <div className="profile-avatar w-24 h-24 bg-indigo-200 flex items-center justify-center text-4xl overflow-hidden flex-shrink-0">
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
                                    <p className="text-xl font-semibold text-gray-900">
                                        {profile?.first_name} {profile?.last_name}
                                    </p>
                                    <p className="text-gray-600 text-sm mt-1">{profile?.location || t('notProvided')}</p>
                                    <p className="text-sm text-gray-500 mt-2">{t('memberSince').replace('{{date}}', new Date(profile?.created_at).toLocaleDateString())}</p>
                                </div>
                            </div>
                        </div>

                        {/* Basic Information Section */}
                        <div className="profile-section">
                            <button
                                onClick={() => toggleSection('basicInfo')}
                                className="profile-accordion-button"
                            >
                                <h2 className="profile-title text-xl font-semibold">{t('basicInformation')}</h2>
                                <span className="text-2xl text-gray-600">
                                    {collapsedSections.basicInfo ? '▶' : '▼'}
                                </span>
                            </button>
                            {!collapsedSections.basicInfo && (
                                <div className="profile-accordion-body">
                                    <div className="profile-grid-2 pt-4">
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
                        <div className="profile-section">
                            <button
                                onClick={() => toggleSection('about')}
                                className="profile-accordion-button"
                            >
                                <h2 className="profile-title text-xl font-semibold">{t('aboutMe')}</h2>
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
                        <div className="profile-section">
                            <button
                                onClick={() => toggleSection('ratings')}
                                className="profile-accordion-button"
                            >
                                <h2 className="profile-title text-xl font-semibold">{t('yourRatingsAsClient')}</h2>
                                <span className="text-2xl text-gray-600">
                                    {collapsedSections.ratings ? '▶' : '▼'}
                                </span>
                            </button>
                            {!collapsedSections.ratings && (
                                <div className="profile-accordion-body">
                                    <p className="text-sm text-gray-600 mb-6">
                                        {t('workersSeeyourRatings')}
                                    </p>
                                    <RatingsDisplay userId={profile?.id} />
                                </div>
                            )}
                        </div>

                        {/* Your Projects Section */}
                        <div className="profile-section">
                            <button
                                onClick={() => toggleSection('projects')}
                                className="profile-accordion-button"
                            >
                                <h2 className="profile-title text-xl font-semibold">{t('yourProjects')}</h2>
                                <span className="text-2xl text-gray-600">
                                    {collapsedSections.projects ? '▶' : '▼'}
                                </span>
                            </button>
                            {!collapsedSections.projects && (
                                <div className="profile-accordion-body">
                                    {/* Motivational Post Job Banner */}
                                    <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
                                        <div className="absolute -top-4 -right-4 text-9xl opacity-10 pointer-events-none select-none leading-none">🚀</div>
                                        <div className="relative z-10">
                                            <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-1">{t('postJobBannerChip')}</p>
                                            <h3 className="text-xl sm:text-2xl font-bold mb-2">{t('postJobBannerTitle')}</h3>
                                            <p className="text-indigo-100 text-sm mb-4 max-w-lg">{t('postJobBannerDesc')}</p>
                                            <div className="flex flex-wrap gap-2 mb-5">
                                                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">{t('postJobFeatureFree')}</span>
                                                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">{t('postJobFeatureInstant')}</span>
                                                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">{t('postJobFeatureWorkers')}</span>
                                                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">{t('postJobFeatureMatching')}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setEditingJobId(null)
                                                    setJobFormData({ title: '', description: '', location: '', jobType: '', salary: '' })
                                                    setDescriptionAutoFilled(false)
                                                    setShowJobModal(true)
                                                }}
                                                className="bg-white text-indigo-700 px-7 py-2.5 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg text-sm active:scale-95"
                                            >
                                                {t('postJobNow')}
                                            </button>
                                        </div>
                                    </div>

                                    {jobsLoading ? (
                                        <div className="text-center py-12">{t('loadingProjects')}</div>
                                    ) : jobs.length === 0 ? (
                                        <div className="text-center py-14 bg-gradient-to-b from-indigo-50 to-white rounded-2xl border-2 border-dashed border-indigo-200">
                                            <div className="text-5xl mb-3">💼</div>
                                            <h4 className="text-gray-800 font-bold text-lg mb-2">{t('postJobEmptyTitle')}</h4>
                                            <p className="text-gray-500 text-sm max-w-xs mx-auto mb-5">{t('postJobEmptyDesc')}</p>
                                            <button
                                                onClick={() => {
                                                    setEditingJobId(null)
                                                    setJobFormData({ title: '', description: '', location: '', jobType: '', salary: '' })
                                                    setDescriptionAutoFilled(false)
                                                    setShowJobModal(true)
                                                }}
                                                className="primary-action px-6 py-2.5 rounded-xl font-bold shadow text-sm"
                                            >
                                                {t('postJobFirstCta')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {jobs.map(job => (
                                                <div key={job.id} className="profile-list-card hover:shadow-lg transition">
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-2">
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                                                            <p className="text-sm text-gray-600 mt-1">{job.location}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleEditJob(job)}
                                                                className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-sm hover:bg-blue-100 transition font-medium"
                                                            >
                                                                {t('editProfile')}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteJob(job.id)}
                                                                className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-sm hover:bg-red-100 transition font-medium"
                                                            >
                                                                {t('delete')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-700 mt-3">{job.description}</p>
                                                    {/* Job media */}
                                                    {Array.isArray(job.media) && job.media.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-4">
                                                            {job.media.map((item, i) => (
                                                                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                                                                    {item.type === 'image' ? (
                                                                        <img src={item.data} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <video src={item.data} className="w-full h-full object-cover" muted playsInline />
                                                                    )}
                                                                    {item.type === 'video' && (
                                                                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">▶</div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="profile-grid-3 mt-4 pt-4 border-t border-gray-200">
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
                        <div className="profile-section">
                            <button
                                onClick={() => toggleSection('completions')}
                                className="profile-accordion-button"
                            >
                                <h2 className="profile-title text-xl font-semibold">{t('activeProjectsCompletion')}</h2>
                                <span className="text-2xl text-gray-600">
                                    {collapsedSections.completions ? '▶' : '▼'}
                                </span>
                            </button>
                            {!collapsedSections.completions && (
                                <div className="profile-accordion-body">
                                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r mb-4">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <h3 className="text-sm font-medium text-red-800">{t('completionOperationFailed')}</h3>
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
                                                    <h3 className="text-sm font-medium text-red-800">{t('completionOperationFailed')}</h3>
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
                        <div className="profile-section">
                            <button
                                onClick={() => toggleSection('applicants')}
                                className="profile-accordion-button"
                            >
                                <h2 className="profile-title text-xl font-semibold">{t('projectApplicants')}</h2>
                                <span className="text-2xl text-gray-600">
                                    {collapsedSections.applicants ? '▶' : '▼'}
                                </span>
                            </button>
                            {!collapsedSections.applicants && (
                                <div className="profile-accordion-body">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pt-4">
                                        <h2 className="profile-title text-xl font-semibold">{t('projectApplicants')}</h2>
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
                                                    <h3 className="text-sm font-medium text-red-800">{t('applicationOperationFailed')}</h3>
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
                                                            <h3 className="text-sm font-medium text-yellow-800">{t('failedLoadApplicants')}</h3>
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
                                                            <div key={job.id} className="profile-list-card">
                                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">{job.title}</h3>
                                                                <div className="space-y-3">
                                                                    {applicants.map(applicant => (
                                                                        <div key={applicant.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-gray-100 pb-4 last:border-b-0 gap-4">
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
                        <div className="profile-section">
                            <button
                                onClick={() => toggleSection('completedProjects')}
                                className="profile-accordion-button"
                            >
                                <h2 className="profile-title text-xl font-semibold">{t('completedJobs')}</h2>
                                <span className="text-2xl text-gray-600">
                                    {collapsedSections.completedProjects ? '▶' : '▼'}
                                </span>
                            </button>
                            {!collapsedSections.completedProjects && (
                                <div className="profile-accordion-body">

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
                                                    <div key={job.id} className="profile-list-card bg-green-50 border-green-200">
                                                        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-2">
                                                            <div>
                                                                <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                                                                <p className="text-sm text-gray-600 mt-1">{job.location}</p>
                                                            </div>
                                                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                                ✓ {t('completed')}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-700 mt-3">{job.description}</p>
                                                        <div className="profile-grid-2 mt-4 pt-4 border-t border-gray-200">
                                                            <div>
                                                                <span className="text-xs font-medium text-gray-600 uppercase">{t('finalPrice')}</span>
                                                                <p className="text-sm text-gray-900 mt-1 font-semibold">$ {completion.final_price || job.budget}</p>
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
                        <div className="profile-section">
                            <h2 className="profile-title text-xl font-semibold mb-6">{t('profilePicture')}</h2>
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className="profile-avatar w-24 h-24 bg-indigo-200 flex items-center justify-center text-4xl overflow-hidden">
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
                        <div className="profile-section">
                            <h2 className="profile-title text-xl font-semibold mb-6">{t('basicInformation')}</h2>
                            <div className="profile-grid-2">
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
                                    <PhoneInput
                                        value={formData.phoneNumber}
                                        onChange={(value) => setFormData({ ...formData, phoneNumber: value })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('location')}</label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        placeholder={t('enterLocation')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Edit About Section */}
                        <div className="profile-section">
                            <h2 className="profile-title text-xl font-semibold mb-6">{t('aboutMe')}</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('skillsYouNeed')}</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    rows="4"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                    placeholder={t('aboutNeedPlaceholder')}
                                />
                                <p className="text-xs text-gray-500 mt-2">{t('helpServiceProviders')}</p>
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="profile-actions">
                            <button
                                type="submit"
                                disabled={updateLoading}
                                className="primary-action px-6 py-2.5 rounded-xl disabled:opacity-50 transition font-medium"
                            >
                                {updateLoading ? t('saving') : t('saveChanges')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="profile-button-secondary px-6 py-2.5 rounded-xl transition font-medium"
                            >
                                {t('cancel')}
                            </button>
                        </div>
                    </form>
                )}

                {/* Job Modal */}
                {showJobModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="glass-surface rounded-3xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/80">
                            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200">
                                <div className="p-6 flex justify-between items-center">
                                    <div>
                                        <h2 className="profile-title text-2xl font-semibold">{editingJobId ? t('editProjectTitle') : t('postNewProject')}</h2>
                                        {!editingJobId && <p className="text-xs text-gray-500 mt-0.5">{t('postJobModalSubtitle')}</p>}
                                    </div>
                                    <button
                                        onClick={() => setShowJobModal(false)}
                                        className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                                    >
                                        ×
                                    </button>
                                </div>
                                {!editingJobId && (
                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 flex items-center gap-3">
                                        <span className="text-xl flex-shrink-0">👷‍♂️</span>
                                        <p className="text-sm text-white font-medium">{t('postJobModalBanner')}</p>
                                    </div>
                                )}
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
                                                <h3 className="text-sm font-medium text-red-800">{editingJobId ? t('failedUpdateProject') : t('failedPostProject')}</h3>
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
                                                <h3 className="text-sm font-medium text-green-800">{editingJobId ? t('projectUpdated') : t('projectPosted')}</h3>
                                                <p className="text-sm text-green-700 mt-2">{editingJobId ? t('projectUpdatedSuccess') : t('projectPostedSuccess')}</p>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('projectTitleField')} *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={jobFormData.title}
                                        onChange={handleJobInputChange}
                                        required
                                        autoFocus={!editingJobId}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        placeholder={t('postJobTitlePlaceholder')}
                                    />
                                    {!editingJobId && (
                                        <p className="text-xs text-indigo-500 mt-1.5">{t('postJobTitleHint')}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('projectDescriptionField')} *</label>
                                    <textarea
                                        name="description"
                                        value={jobFormData.description}
                                        onChange={handleJobInputChange}
                                        required
                                        rows="5"
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-colors ${descriptionAutoFilled ? 'border-indigo-300 bg-indigo-50/40' : 'border-gray-300'}`}
                                        placeholder={t('aboutNeedPlaceholder')}
                                    />
                                    {descriptionAutoFilled && (
                                        <p className="text-xs text-indigo-500 mt-1.5">{t('postJobDescAutoHint')}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                                        <select
                                            name="location"
                                            value={jobFormData.location}
                                            onChange={handleJobInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        >
                                            <option value="">{t('selectLocation')}</option>
                                            {togoLocations.map(loc => (
                                                <option key={loc.value} value={loc.value}>{loc.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('projectTypeField')}</label>
                                        <select
                                            name="jobType"
                                            value={jobFormData.jobType}
                                            onChange={handleJobInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        >
                                            <option value="">{t('selectType')}</option>
                                            <option value="one-time">{t('oneTime')}</option>
                                            <option value="ongoing">{t('ongoing')}</option>
                                            <option value="part-time">{t('partTime')}</option>
                                            <option value="full-time">{t('fullTime')}</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('hiringRateBudget')}</label>
                                    <input
                                        type="text"
                                        name="salary"
                                        value={jobFormData.salary}
                                        onChange={handleJobInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        placeholder={t('budgetPlaceholder')}
                                    />
                                </div>

                                {/* Media upload - optional */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('jobMediaLabel')} <span className="text-gray-400 font-normal text-xs ml-1">({t('optional')})</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">{t('jobMediaHint').replace('{{max}}', MAX_JOB_MEDIA).replace('{{mb}}', MAX_VIDEO_MB)}</p>

                                    {/* Previews */}
                                    {jobFormData.media?.length > 0 && (
                                        <div className="flex flex-wrap gap-3 mb-3">
                                            {jobFormData.media.map((item, i) => (
                                                <div key={i} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                                                    {item.type === 'image' ? (
                                                        <img src={item.data} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <video src={item.data} className="w-full h-full object-cover" muted playsInline />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveJobMedia(i)}
                                                            className="opacity-0 group-hover:opacity-100 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold transition-opacity"
                                                            title={t('jobMediaRemove')}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                    {item.type === 'video' && (
                                                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">▶</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {(jobFormData.media?.length || 0) < MAX_JOB_MEDIA && (
                                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {t('jobMediaUploadBtn')}
                                            <input
                                                type="file"
                                                accept="image/*,video/*"
                                                multiple
                                                onChange={handleJobMediaChange}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                                    <button
                                        type="submit"
                                        disabled={jobFormLoading}
                                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {jobFormLoading ? t('postingProject') : editingJobId ? t('updateProject') : t('postProject')}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={jobFormLoading}
                                        onClick={() => setShowJobModal(false)}
                                        className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition font-medium flex-1 disabled:opacity-50"
                                    >
                                        {t('cancel')}
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
