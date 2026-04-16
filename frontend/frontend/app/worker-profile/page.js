'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import completionClient from '@/lib/completionClient'
import RatingModal from '@/components/RatingModal'
import WorkerRatingsDisplay from '@/components/WorkerRatingsDisplay'
import FollowStats from '@/components/FollowStats'
import FollowNotificationBell from '@/components/FollowNotificationBell'
import PhoneInput from '@/components/PhoneInput'
import { handworks } from '@/lib/togoData'
import { useLanguage } from '@/context/LanguageContext'

function normalizeStringArray(value) {
    if (Array.isArray(value)) {
        return value.filter(item => item && typeof item === 'string')
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed)
                ? parsed.filter(item => item && typeof item === 'string')
                : []
        } catch {
            return []
        }
    }

    return []
}

function normalizeWorkerProfile(rawProfile, fallbackEmail = '') {
    const portfolio = normalizeStringArray(rawProfile?.portfolio)
    const services = normalizeStringArray(rawProfile?.services)

    const firstName = rawProfile?.first_name ?? rawProfile?.firstName ?? ''
    const lastName = rawProfile?.last_name ?? rawProfile?.lastName ?? ''
    const phoneNumber = rawProfile?.phone_number ?? rawProfile?.phoneNumber ?? ''
    const jobTitle = rawProfile?.job_title ?? rawProfile?.jobTitle ?? ''
    const yearsExperience = rawProfile?.years_experience ?? rawProfile?.yearsExperience ?? 0
    const email = rawProfile?.email || fallbackEmail || ''

    const profilePicture =
        rawProfile?.profile_picture
        || rawProfile?.profilePicture
        || (portfolio.length > 0 ? portfolio[0] : null)

    const userType = rawProfile?.user_type || rawProfile?.userType || 'worker'
    const emailVerified = Boolean(rawProfile?.email_verified ?? rawProfile?.emailVerified)
    const isActive = Boolean(rawProfile?.is_active)

    return {
        ...(rawProfile || {}),
        email,
        first_name: firstName,
        firstName,
        last_name: lastName,
        lastName,
        phone_number: phoneNumber,
        phoneNumber,
        job_title: jobTitle,
        jobTitle,
        location: rawProfile?.location || '',
        bio: rawProfile?.bio || '',
        years_experience: yearsExperience,
        yearsExperience,
        services,
        portfolio,
        profile_picture: profilePicture,
        profilePicture,
        user_type: userType,
        userType,
        email_verified: emailVerified,
        emailVerified,
        is_active: isActive,
        completed_jobs: rawProfile?.completed_jobs ?? rawProfile?.completedJobs ?? 0,
        completedJobs: rawProfile?.completed_jobs ?? rawProfile?.completedJobs ?? 0
    }
}

export default function WorkerProfilePage() {
    const { t } = useLanguage()
    const { user, isLoading: authLoading } = useAuth({ requiredRole: 'worker' })
    const [profile, setProfile] = useState(null)
    const [followerCount, setFollowerCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        isWorker: false,
        jobTitle: '',
        location: '',
        bio: '',
        yearsExperience: 0,
        services: [],
        portfolio: [],
        profilePicture: null
    })
    const [updateLoading, setUpdateLoading] = useState(false)
    const [updateError, setUpdateError] = useState(null)
    const [updateSuccess, setUpdateSuccess] = useState(false)
    const [profilePicturePreview, setProfilePicturePreview] = useState(null)
    const [newService, setNewService] = useState('')
    const [portfolioFiles, setPortfolioFiles] = useState([])
    const [timeoutWarning, setTimeoutWarning] = useState(false)
    const [appliedJobs, setAppliedJobs] = useState([])
    const [savedJobs, setSavedJobs] = useState([])  // jobs worker saved for later
    const [finishedJobs, setFinishedJobs] = useState([])
    const [pendingJobs, setPendingJobs] = useState([])
    const [ratings, setRatings] = useState([])  // ratings received from clients
    const [jobsLoading, setJobsLoading] = useState(false)
    const [verifyingEmail, setVerifyingEmail] = useState(false)
    const [emailVerificationError, setEmailVerificationError] = useState('')
    const [emailResendLoading, setEmailResendLoading] = useState(false)
    const [emailResendCooldown, setEmailResendCooldown] = useState(0)
    const [completionStatus, setCompletionStatus] = useState({})
    const [requestingCompletion, setRequestingCompletion] = useState({})
    const [showRatingModal, setShowRatingModal] = useState(false)
    const [ratingCompletionId, setRatingCompletionId] = useState(null)
    const [completionSuccess, setCompletionSuccess] = useState('')
    const [confirmedCompletions, setConfirmedCompletions] = useState([])
    const [isAvailabilityToggling, setIsAvailabilityToggling] = useState(false)
    const [availabilityError, setAvailabilityError] = useState('')
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

        async function fetchProfile() {
            try {
                setLoading(true)
                setJobsLoading(true)
                setError(null)
                setTimeoutWarning(false)

                // Warn early if profile bootstrap is slow.
                warningTimeoutId = setTimeout(() => {
                    if (isMounted) setTimeoutWarning(true)
                }, 8000)

                // Keep initial profile fetch strict for better perceived performance.
                timeoutId = setTimeout(() => {
                    if (isMounted) {
                        setLoading(false)
                        setJobsLoading(false)
                        setError(t('profileTookTooLong'))
                    }
                }, 15000)

                const fetchSavedJobsForWorker = async (workerId) => {
                    try {
                        const { data, error } = await Promise.race([
                            supabase
                                .from('saved_jobs')
                                .select('created_at,job:job_id(id,title,description,budget,location,status,client_id,created_at)')
                                .eq('user_id', workerId)
                                .order('created_at', { ascending: false }),
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('SAVED_JOBS_TIMEOUT')), 2500)
                            )
                        ])

                        if (error) {
                            // Keep profile usable even when saved_jobs table is unavailable.
                            console.warn('Failed to fetch saved jobs:', error.message)
                            return []
                        }

                        return (data || [])
                            .map(row => row.job)
                            .filter(Boolean)
                    } catch (savedJobsErr) {
                        if (!/SAVED_JOBS_TIMEOUT/i.test(savedJobsErr?.message || '')) {
                            console.warn('Saved jobs fetch skipped:', savedJobsErr?.message || savedJobsErr)
                        }
                        return []
                    }
                }

                // Load full worker payload in one RPC so all page data arrives together.
                let payload = null
                let payloadError = null

                try {
                    const rpcResult = await Promise.race([
                        supabase.rpc('get_worker_profile_payload'),
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
                    const [profileRes, applicationsRes, reviewsRes, savedJobsData] = await Promise.all([
                        supabase
                            .from('users')
                            .select('id,email,first_name,last_name,phone_number,job_title,location,bio,years_experience,portfolio,services,rating,user_type,completed_jobs,is_active,profile_picture,created_at,updated_at')
                            .eq('id', user.id)
                            .single(),
                        supabase
                            .from('applications')
                            .select('id,job_id,status,proposed_price,message,created_at,job:job_id(id,title,description,budget,location,status,client_id,created_at)')
                            .eq('worker_id', user.id)
                            .order('created_at', { ascending: false }),
                        supabase
                            .from('reviews')
                            .select('id,rating,comment,created_at,rater_type,client_id')
                            .eq('worker_id', user.id)
                            .eq('rater_type', 'client')
                            .order('created_at', { ascending: false }),
                        fetchSavedJobsForWorker(user.id)
                    ])

                    if (profileRes.error) {
                        throw new Error(`Failed to fetch profile payload: ${profileRes.error.message}`)
                    }
                    if (applicationsRes.error) {
                        throw new Error(`Failed to fetch profile payload: ${applicationsRes.error.message}`)
                    }
                    if (reviewsRes.error) {
                        throw new Error(`Failed to fetch profile payload: ${reviewsRes.error.message}`)
                    }
                    resolvedPayload = {
                        profile: {
                            ...(profileRes.data || {}),
                            email_verified: false
                        },
                        applications: applicationsRes.data || [],
                        reviews: reviewsRes.data || [],
                        saved_jobs: savedJobsData
                    }
                }

                if (!isMounted) return

                let userData = resolvedPayload?.profile
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
                        console.warn('Failed to hydrate worker profile picture from users table:', profilePictureError.message)
                    } else if (profilePictureData) {
                        hydratedUserData = {
                            ...userData,
                            profile_picture: profilePictureData.profile_picture || null
                        }
                    }
                }

                const normalizedUserData = normalizeWorkerProfile(hydratedUserData, user?.email)

                const applicationsData = Array.isArray(resolvedPayload?.applications) ? resolvedPayload.applications : []
                const ratingsData = Array.isArray(resolvedPayload?.reviews) ? resolvedPayload.reviews : []
                let savedJobsData = Array.isArray(resolvedPayload?.saved_jobs) ? resolvedPayload.saved_jobs : []
                if (savedJobsData.length === 0) {
                    savedJobsData = await fetchSavedJobsForWorker(user.id)
                }

                setProfile(normalizedUserData)
                setProfilePicturePreview(normalizedUserData.profilePicture)

                setFormData({
                    email: normalizedUserData.email,
                    firstName: normalizedUserData.firstName,
                    lastName: normalizedUserData.lastName,
                    phoneNumber: normalizedUserData.phoneNumber,
                    isWorker: normalizedUserData.user_type === 'worker',
                    jobTitle: normalizedUserData.jobTitle,
                    location: normalizedUserData.location,
                    bio: normalizedUserData.bio,
                    yearsExperience: normalizedUserData.yearsExperience,
                    services: normalizedUserData.services,
                    portfolio: normalizedUserData.portfolio,
                    profilePicture: normalizedUserData.profilePicture
                })

                let apps = applicationsData.map(app => ({
                    ...app,
                    job: app.job || null
                }))

                const applied = apps.filter(app => app.status === 'pending')
                const accepted = apps.filter(app => app.status === 'accepted')
                const finished = apps.filter(app => app.status === 'completed')

                setAppliedJobs(applied)
                setPendingJobs(accepted)
                setFinishedJobs(finished)
                setRatings(ratingsData)
                setSavedJobs(savedJobsData)

                clearTimeout(timeoutId)
                clearTimeout(warningTimeoutId)
                setLoading(false)
                setJobsLoading(false)
                setTimeoutWarning(false)

                    // Load confirmed completions after initial paint so refresh is not blocked.
                    ; (async () => {
                        try {
                            const completionsResult = await Promise.race([
                                supabase
                                    .from('completions')
                                    .select('id,final_price,confirmed_at,job:job_id(id,title,location,budget)')
                                    .eq('worker_id', user.id)
                                    .eq('status', 'confirmed')
                                    .order('confirmed_at', { ascending: false }),
                                new Promise((_, reject) => setTimeout(() => reject(new Error('COMPLETIONS_TIMEOUT')), 2500))
                            ])

                            if (!isMounted) return
                            const completionsData = completionsResult?.data || []
                            setConfirmedCompletions(completionsData.filter(c => c.job))
                        } catch (completionsErr) {
                            if (!/COMPLETIONS_TIMEOUT/i.test(completionsErr?.message || '')) {
                                console.warn('Failed to fetch confirmed completions:', completionsErr?.message || completionsErr)
                            }
                        }
                    })()

            } catch (err) {
                clearTimeout(timeoutId)
                clearTimeout(warningTimeoutId)

                if (!isMounted) return

                console.error('Failed to fetch profile data:', err)
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
                } else if (err.status === 401) {
                    errorMessage = t('unauthorizedMsg')
                } else if (err.status === 500) {
                    errorMessage = t('serverErrorMsg')
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

        fetchProfile()

        return () => {
            isMounted = false
            clearTimeout(timeoutId)
            clearTimeout(warningTimeoutId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // No realtime subscriptions here: profile flows use explicit fetch/write only.

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : (name === 'yearsExperience' ? parseInt(value) || 0 : value)
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

    const handleAddService = () => {
        if (newService.trim()) {
            setFormData({
                ...formData,
                services: [...formData.services, newService]
            })
            setNewService('')
        }
    }

    const handleRemoveService = (idx) => {
        setFormData({
            ...formData,
            services: formData.services.filter((_, i) => i !== idx)
        })
    }

    const handlePortfolioChange = (e) => {
        const files = Array.from(e.target.files || [])

        files.forEach(async (file) => {
            const dataUrl = await compressImage(file)
            setFormData(prev => ({
                ...prev,
                portfolio: [...prev.portfolio, dataUrl]
            }))
            setPortfolioFiles(prev => [...prev, {
                name: file.name,
                url: dataUrl,
                file: file
            }])
        })
    }

    const handleRemovePortfolio = (idx) => {
        setFormData({
            ...formData,
            portfolio: formData.portfolio.filter((_, i) => i !== idx)
        })
        setPortfolioFiles(portfolioFiles.filter((_, i) => i !== idx))
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

            const portfolioData = normalizeStringArray(formData.portfolio)
            const currentPortfolio = normalizeStringArray(profile?.portfolio)
            const hasPortfolioChanged =
                portfolioData.length !== currentPortfolio.length
                || portfolioData.some((item, idx) => item !== currentPortfolio[idx])

            const currentProfilePicture = profile?.profile_picture || profile?.profilePicture || null
            const nextProfilePicture = formData.profilePicture || null
            const hasProfilePictureChanged = nextProfilePicture !== currentProfilePicture

            const nextBasePayload = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone_number: formData.phoneNumber,
                job_title: formData.jobTitle,
                location: formData.location,
                bio: formData.bio,
                years_experience: formData.yearsExperience,
                services: formData.services
            }

            const updatePayload = {}
            for (const [key, nextValue] of Object.entries(nextBasePayload)) {
                const currentValue = profile?.[key]
                const isSameArray = Array.isArray(nextValue)
                    && Array.isArray(currentValue)
                    && nextValue.length === currentValue.length
                    && nextValue.every((item, idx) => item === currentValue[idx])

                if (isSameArray || nextValue === currentValue) continue
                updatePayload[key] = nextValue
            }

            if (hasPortfolioChanged) {
                updatePayload.portfolio = portfolioData
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

            const { data: updatedData, error } = await supabase
                .from('users')
                .update(updatePayload)
                .eq('id', user.id)
                .select('id,email,first_name,last_name,phone_number,job_title,location,bio,years_experience,portfolio,services,rating,user_type,completed_jobs,is_active,profile_picture,created_at,updated_at')
                .single()

            if (error) throw error

            // Use the actual saved row from the database instead of reconstructing locally
            const normalizedUpdatedUser = normalizeWorkerProfile(updatedData || profile, profile?.email || user?.email)
            setProfile(normalizedUpdatedUser)
            setProfilePicturePreview(normalizedUpdatedUser.profilePicture)

            // Sync formData so the edit form reflects what was actually saved
            setFormData({
                email: normalizedUpdatedUser.email,
                firstName: normalizedUpdatedUser.firstName,
                lastName: normalizedUpdatedUser.lastName,
                phoneNumber: normalizedUpdatedUser.phoneNumber,
                isWorker: normalizedUpdatedUser.user_type === 'worker',
                jobTitle: normalizedUpdatedUser.jobTitle,
                location: normalizedUpdatedUser.location,
                bio: normalizedUpdatedUser.bio,
                yearsExperience: normalizedUpdatedUser.yearsExperience,
                services: normalizedUpdatedUser.services,
                portfolio: normalizedUpdatedUser.portfolio,
                profilePicture: normalizedUpdatedUser.profilePicture
            })

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

    const handleToggleAvailability = async () => {
        setIsAvailabilityToggling(true)
        setAvailabilityError('')

        try {
            const newAvailabilityStatus = !profile.is_active

            const { data, error } = await supabase
                .from('users')
                .update({ is_active: newAvailabilityStatus })
                .eq('id', user.id)
                .select()
                .single()

            if (error) throw error

            setProfile(prev => normalizeWorkerProfile({
                ...(prev || {}),
                ...(data || {})
            }, prev?.email || user?.email))
        } catch (err) {
            console.error('Failed to update availability status', err)
            setAvailabilityError(err.message || t('failedUpdateAvailabilityStatus'))
        } finally {
            setIsAvailabilityToggling(false)
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

    const handleRequestCompletion = async (jobId) => {
        console.log('Requesting completion for job ID:', jobId)
        setRequestingCompletion(prev => ({ ...prev, [jobId]: true }))
        try {
            const result = await completionClient.requestCompletion(jobId)
            console.log('Completion request successful:', result)
            // Get updated completion status
            const status = await completionClient.getCompletionStatus(jobId)
            setCompletionStatus(prev => ({ ...prev, [jobId]: status }))
            setCompletionSuccess(t('completionSentSuccess'))
            const id = setTimeout(() => setCompletionSuccess(''), 4000)
            timeoutsRef.current.push(id)
        } catch (err) {
            console.error('Failed to request completion:', err)
            const errorMessage = err.response?.data?.error || err.message || t('failedRequestCompletion')
            setUpdateError(errorMessage)
            const id = setTimeout(() => setUpdateError(null), 5000)
            timeoutsRef.current.push(id)
        } finally {
            setRequestingCompletion(prev => ({ ...prev, [jobId]: false }))
        }
    }

    const loadCompletionStatus = async (jobId) => {
        try {
            const status = await completionClient.getCompletionStatus(jobId)
            setCompletionStatus(prev => ({ ...prev, [jobId]: status }))
        } catch (err) {
            console.error('Failed to load completion status:', err)
        }
    }

    // Load completion status for all pending jobs
    useEffect(() => {
        if (pendingJobs.length > 0) {
            pendingJobs.forEach(job => {
                const jobId = job.job_id || job.id
                if (jobId) {
                    loadCompletionStatus(jobId)
                }
            })
        }
    }, [pendingJobs])

    // Handle email resend cooldown timer
    useEffect(() => {
        if (emailResendCooldown > 0) {
            const timer = setTimeout(() => {
                setEmailResendCooldown(emailResendCooldown - 1)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [emailResendCooldown])

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
                {/* Header */}
                <div className="profile-hero fade-in-up mb-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between mb-6 relative">
                        <div>
                            <span className="profile-chip mb-3">{t('workerProfile')}</span>
                            <h1 className="profile-title text-3xl sm:text-4xl font-bold text-gray-900">{t('yourWorkerProfile')}</h1>
                            <p className="profile-muted mt-2 max-w-2xl">{t('buildProfessional')}</p>
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
                                <Link
                                    href="/job-alerts"
                                    className="profile-button-secondary px-4 py-2 rounded-xl font-semibold"
                                >
                                    🔔 {t('jobAlertsCta')}
                                </Link>
                                <button
                                    onClick={handleToggleAvailability}
                                    disabled={isAvailabilityToggling}
                                    className={`px-4 py-2 rounded-xl font-semibold transition shadow-sm ${profile?.is_active
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isAvailabilityToggling ? `${t('loading')}...` : (profile?.is_active ? t('availabilityActive') : t('availabilityInactive'))}
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
                        <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4">
                            ✓ {t('profileUpdatedSuccess')}
                        </div>
                    )}

                    {completionSuccess && (
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-lg mb-4 border border-blue-200">
                            {completionSuccess}
                        </div>
                    )}

                    {updateError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
                            {updateError}
                        </div>
                    )}

                    {availabilityError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
                            {availabilityError}
                        </div>
                    )}

                    {/* Email Verification Section */}
                    {profile && !profile.email_verified && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r rounded-xl">
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
                                                        {emailResendCooldown > 0 ? `${t('getNewCodeIn').replace('{{seconds}}', emailResendCooldown)}` : emailResendLoading ? t('sendingCode') : t('getNewCode')}
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
                                    {profilePicturePreview ? (
                                        <img
                                            src={profilePicturePreview}
                                            alt={t('profilePicture')}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        '👤'
                                    )}
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-gray-900">
                                        {profile.firstName} {profile.lastName}
                                    </p>
                                    <p className="text-indigo-600 font-semibold mt-1">{profile.jobTitle || t('serviceProvider')}</p>
                                    <p className="text-gray-600 text-sm mt-2">{profile.location || t('locationNotSet')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Basic Information */}
                        <div className="profile-section">
                            <h3 className="profile-title text-xl font-semibold mb-5">{t('basicInformation')}</h3>
                            <div className="profile-grid-2">
                                <div>
                                    <span className="font-medium text-gray-700">{t('firstName')}:</span>
                                    <p className="text-gray-900">{profile.firstName || t('notAvailable')}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">{t('lastName')}:</span>
                                    <p className="text-gray-900">{profile.lastName || t('notAvailable')}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">{t('email')}:</span>
                                    <p className="text-gray-900">{profile.email}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">{t('phone')}:</span>
                                    <p className="text-gray-900">{profile.phoneNumber || t('notAvailable')}</p>
                                </div>
                            </div>
                        </div>

                        {profile.user_type === 'worker' && (
                            <>
                                {/* Professional Profile */}
                                <div className="profile-section">
                                    <h3 className="profile-title text-xl font-semibold mb-5">{t('professionalProfile')}</h3>
                                    <div className="profile-grid-3">
                                        <div>
                                            <span className="font-medium text-gray-700">{t('jobTitle')}:</span>
                                            <p className="text-gray-900">{profile.jobTitle || t('notAvailable')}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">{t('location')}:</span>
                                            <p className="text-gray-900">{profile.location || t('notAvailable')}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">{t('yearsExperience')}:</span>
                                            <p className="text-gray-900">{profile.yearsExperience || 0} {t('years')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* About Me */}
                                <div className="profile-section">
                                    <h3 className="profile-title text-xl font-semibold mb-4">{t('aboutMe')}</h3>
                                    <p className="text-gray-900">{profile.bio || t('noDescriptionProvided')}</p>
                                </div>

                                {/* Services */}
                                <div className="profile-section">
                                    <h3 className="profile-title text-xl font-semibold mb-4">{t('servicesSkills')}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {(profile.services || []).length === 0 ? (
                                            <span className="text-gray-500">{t('noServicesListed')}</span>
                                        ) : (
                                            (profile.services || []).map((s, idx) => (
                                                <span key={idx} className="px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">{s}</span>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Portfolio */}
                                <div className="profile-section">
                                    <h3 className="profile-title text-xl font-semibold mb-4">{t('portfolio')}</h3>
                                    <div className="profile-grid-3">
                                        {(profile.portfolio || []).length === 0 ? (
                                            <span className="text-gray-500">{t('noPortfolioImages')}</span>
                                        ) : (
                                            (profile.portfolio || []).map((img, idx) => {
                                                // Handle both array of strings and array of objects
                                                const imageUrl = typeof img === 'string' ? img : (img?.url || img?.name || '')
                                                const isValidImage = imageUrl && (imageUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(imageUrl))

                                                return (
                                                    <div key={idx} className="profile-list-card bg-gray-100 h-40 flex items-center justify-center overflow-hidden border border-gray-200">
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
                                <div className="profile-section">
                                    <h3 className="profile-title text-xl font-semibold mb-6">{t('publicRatings')}</h3>
                                    <p className="text-sm text-gray-600 mb-6">
                                        {t('ratingsDescription')}
                                    </p>
                                    <WorkerRatingsDisplay workerId={profile.id} />
                                </div>

                                {/* Jobs Tracking Section */}
                                <div className="profile-section">
                                    <h3 className="profile-title text-xl font-semibold mb-6">{t('jobApplicationsStatus')}</h3>

                                    {/* Stats Cards */}
                                    <div className="profile-grid-4 mb-8">
                                        {/* Saved Jobs */}
                                        <div className="profile-stat-card border-teal-200 bg-teal-50">
                                            <h4 className="font-semibold text-teal-900 mb-3 flex items-center gap-2">
                                                <span className="text-2xl">💾</span> {t('savedJobsCountLabel')}
                                            </h4>
                                            <p className="text-3xl font-bold text-teal-600">{savedJobs.length}</p>
                                            <p className="text-xs text-teal-700 mt-2">{t('savedJobsDescription')}</p>
                                        </div>

                                        {/* Applied Jobs */}
                                        <div className="profile-stat-card border-blue-200 bg-blue-50">
                                            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                                <span className="text-2xl">📝</span> {t('applied')}
                                            </h4>
                                            <p className="text-3xl font-bold text-blue-600">{appliedJobs.length}</p>
                                            <p className="text-xs text-blue-700 mt-2">{t('pendingReview')}</p>
                                        </div>

                                        {/* Accepted Jobs */}
                                        <div className="profile-stat-card border-green-200 bg-green-50">
                                            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                                                <span className="text-2xl">✅</span> {t('accepted')}
                                            </h4>
                                            <p className="text-3xl font-bold text-green-600">{pendingJobs.length}</p>
                                            <p className="text-xs text-green-700 mt-2">{t('acceptedJobsDescription')}</p>
                                        </div>

                                        {/* Finished Jobs */}
                                        <div className="profile-stat-card border-purple-200 bg-purple-50">
                                            <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                                <span className="text-2xl">🏆</span> {t('completed')}
                                            </h4>
                                            <p className="text-3xl font-bold text-purple-600">{profile?.completedJobs ?? 0}</p>
                                            <p className="text-xs text-purple-700 mt-2">{t('completedJobsDescription')}</p>
                                        </div>
                                    </div>

                                    {/* Saved Jobs Details */}
                                    {savedJobs.length > 0 && (
                                        <div className="mb-6 bg-teal-50 rounded-2xl p-4 sm:p-5">
                                            <h4 className="font-semibold text-teal-900 mb-3">{t('savedJobs')}</h4>
                                            <div className="space-y-2">
                                                {savedJobs.map(job => (
                                                    <div key={job.id} className="profile-list-card border-teal-200">
                                                        <p className="font-medium text-gray-900">{job.title}</p>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            <span>📍 {job.location}</span>
                                                            {job.salary && <span className="ml-3">💰 CFA {job.salary}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Applied Jobs Details */}
                                    {appliedJobs.length > 0 && (
                                        <div className="mb-6 bg-blue-50 rounded-2xl p-4 sm:p-5">
                                            <h4 className="font-semibold text-blue-900 mb-3">{t('appliedJobsPending')}</h4>
                                            <div className="space-y-2">
                                                {appliedJobs.map(job => {
                                                    const displayJob = job.job || job
                                                    const jobId = job.job_id || displayJob.id || job.id

                                                    return (
                                                        <div key={job.id || jobId} className="profile-list-card border-blue-200">
                                                            <p className="font-medium text-gray-900">{displayJob.title || t('jobFallbackApplied')}</p>
                                                            <div className="text-xs text-gray-600 mt-1">
                                                                <span>📍 {displayJob.location || t('notProvided')}</span>
                                                                {(displayJob.salary || displayJob.budget) && <span className="ml-3">💰 $ {displayJob.salary || displayJob.budget}</span>}
                                                            </div>
                                                            <div className="text-xs text-blue-600 mt-1">{t('status')}: <span className="font-semibold">{t('pendingReviewStatus')}</span></div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Accepted Jobs Details */}
                                    {pendingJobs.length > 0 && (
                                        <div className="mb-6 bg-green-50 rounded-2xl p-4 sm:p-5">
                                            <h4 className="font-semibold text-green-900 mb-3">{t('acceptedJobsInProgress')}</h4>
                                            <div className="space-y-3">
                                                {pendingJobs.map(job => {
                                                    const jobId = job.job_id || job.id
                                                    const displayJob = job.job || job
                                                    const hasConfirmedCompletion = confirmedCompletions.some(c => c?.job?.id === jobId)
                                                    const status = completionStatus[jobId]
                                                        || (hasConfirmedCompletion ? { status: 'completed_and_rated' } : { status: 'not_requested' })
                                                    const isCompleted = status.status === 'confirmed' || status.status === 'completed_and_rated'

                                                    return (
                                                        <div key={job.id || jobId} className="profile-list-card border-green-200">
                                                            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start">
                                                                <div className="flex-1">
                                                                    <p className="font-medium text-gray-900">{displayJob.title || t('jobFallbackAccepted')}</p>
                                                                    <div className="text-xs text-gray-600 mt-1">
                                                                        <span>📍 {displayJob.location || t('notProvided')}</span>
                                                                        {(displayJob.salary || displayJob.budget) && <span className="ml-3">💰 $ {displayJob.salary || displayJob.budget}</span>}
                                                                    </div>
                                                                </div>

                                                                {/* Completion Status Indicator */}
                                                                {status.status === 'not_requested' ? (
                                                                    <button
                                                                        onClick={() => handleRequestCompletion(jobId)}
                                                                        disabled={requestingCompletion[jobId]}
                                                                        className="mt-2 lg:mt-0 lg:ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                                                                    >
                                                                        {requestingCompletion[jobId] ? t('requesting') : t('markAsCompleted')}
                                                                    </button>
                                                                ) : status.status === 'pending' ? (
                                                                    <div className="mt-2 lg:mt-0 lg:ml-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm flex items-center gap-2">
                                                                        <span className="animate-spin">⏳</span> {t('pendingReviewStatus')}
                                                                    </div>
                                                                ) : status.status === 'declined' ? (
                                                                    <div className="mt-2 lg:mt-0 lg:ml-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm">
                                                                        <p className="font-semibold">{t('declined')}</p>
                                                                        <p className="text-xs mt-1">{status.reason_for_decline}</p>
                                                                    </div>
                                                                ) : isCompleted ? (
                                                                    <div className="mt-2 lg:mt-0 lg:ml-4 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm">
                                                                        <p className="font-semibold">{t('completedStatus')}</p>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Confirmed Completed Jobs Details */}
                                    {confirmedCompletions.length > 0 && (
                                        <div className="bg-purple-50 rounded-2xl p-4 sm:p-5">
                                            <h4 className="font-semibold text-purple-900 mb-3">{t('completedJobsLabel')}</h4>
                                            <div className="space-y-2">
                                                {confirmedCompletions.map(c => (
                                                    <div key={c.id} className="profile-list-card border-purple-200">
                                                        <p className="font-medium text-gray-900">{c.job?.title}</p>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            <span>📍 {c.job?.location}</span>
                                                            {c.final_price && <span className="ml-3">💰 $ {c.final_price}</span>}
                                                        </div>
                                                        <div className="text-xs text-purple-600 mt-1">✅ {t('confirmedOn')}: <span className="font-semibold">{c.confirmed_at ? new Date(c.confirmed_at).toLocaleDateString() : '—'}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No Jobs Message */}
                                    {savedJobs.length === 0 && appliedJobs.length === 0 && pendingJobs.length === 0 && finishedJobs.length === 0 && confirmedCompletions.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <p>{t('noJobApplicationsYet')}</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    // Edit Mode
                    <form onSubmit={handleUpdate} className="space-y-6">
                        {/* Profile Picture Edit */}
                        <div className="profile-section">
                            <h3 className="profile-title text-xl font-semibold mb-4">{t('profilePictureLabel')}</h3>
                            <div className="flex flex-col sm:flex-row items-start gap-6">
                                <div className="profile-avatar w-24 h-24 bg-indigo-200 flex items-center justify-center text-4xl overflow-hidden flex-shrink-0">
                                    {profilePicturePreview ? (
                                        <img
                                            src={profilePicturePreview}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        '👤'
                                    )}
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('uploadPhotoLabel')}</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleProfilePictureChange}
                                        className="block w-full text-sm text-gray-500 border border-gray-300 rounded px-3 py-2 cursor-pointer"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF (max 5MB)</p>
                                </div>
                            </div>
                        </div>

                        {/* Basic Information Edit */}
                        <div className="profile-section">
                            <h3 className="profile-title text-xl font-semibold mb-4">{t('basicInformation')}</h3>
                            <div className="profile-grid-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('firstName')}</label>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('lastName')}</label>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
                                    <PhoneInput
                                        value={formData.phoneNumber}
                                        onChange={(value) => setFormData({ ...formData, phoneNumber: value })}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Professional Information Edit */}
                        <div className="profile-section">
                            <h3 className="profile-title text-xl font-semibold mb-4">{t('professionalInfoLabel')}</h3>
                            <div className="space-y-4">
                                <div className="profile-grid-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('jobTitleLabel')}</label>
                                        <input
                                            type="text"
                                            name="jobTitle"
                                            value={formData.jobTitle}
                                            onChange={handleInputChange}
                                            placeholder={t('jobTitlePlaceholder')}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationLabel')}</label>
                                        <input
                                            type="text"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                            placeholder={t('enterLocation')}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('yearsExperienceLabel')}</label>
                                        <input
                                            type="number"
                                            name="yearsExperience"
                                            value={formData.yearsExperience}
                                            onChange={handleInputChange}
                                            min="0"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('bioAboutYouLabel')}</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                        rows="4"
                                        placeholder={t('bioPlaceholder')}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{t('bioHint')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Services Edit */}
                        <div className="profile-section">
                            <h3 className="profile-title text-xl font-semibold mb-4">{t('servicesHandworks')}</h3>
                            <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                <select
                                    value={newService}
                                    onChange={(e) => setNewService(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                >
                                    <option value="">{t('selectHandwork')}</option>
                                    {handworks.map(hw => (
                                        <option key={hw.value} value={hw.label}>{hw.label}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleAddService}
                                    disabled={!newService}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {t('addService')}
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(formData.services || []).map((s, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm flex items-center gap-2">
                                        {s}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveService(idx)}
                                            className="text-indigo-600 hover:text-indigo-900 font-bold"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Portfolio Edit */}
                        <div className="profile-section">
                            <h3 className="profile-title text-xl font-semibold mb-4">{t('portfolioLabel')}</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('uploadClearPhotosLabel')}</label>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handlePortfolioChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    <span className="font-semibold text-indigo-700">{t('uploadQualityHint')}</span><br />
                                    {t('uploadPhotosHint')}
                                </p>
                            </div>
                            <div className="profile-grid-3">
                                {(formData.portfolio || []).map((img, idx) => {
                                    // Handle both array of strings and array of objects
                                    const imageUrl = typeof img === 'string' ? img : (img?.url || '')
                                    const imageName = typeof img === 'object' ? img.name : ''
                                    const isValidImage = imageUrl && (imageUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(imageUrl))

                                    return (
                                        <div key={idx} className="relative profile-list-card bg-gray-100 h-40 overflow-hidden group border border-gray-200">
                                            {isValidImage ? (
                                                <img src={imageUrl} alt={`portfolio-${idx}`} className="w-full h-full object-cover" onError={(e) => {
                                                    e.target.style.display = 'none'
                                                    const errorDiv = e.target.nextSibling
                                                    if (errorDiv) errorDiv.style.display = 'flex'
                                                }} />
                                            ) : null}
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-2 bg-gray-50" style={{ display: isValidImage ? 'none' : 'flex' }}>
                                                {imageName && <span className="text-gray-600">{imageName}</span>}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePortfolio(idx)}
                                                className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 opacity-0 group-hover:opacity-100 transition"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )
                                })}
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
            </div>

            {/* Rating Modal */}
            <RatingModal
                completionId={ratingCompletionId}
                isOpen={showRatingModal}
                onClose={() => setShowRatingModal(false)}
                onSuccess={() => {
                    // Reload completion status
                    if (ratingCompletionId) {
                        loadCompletionStatus(ratingCompletionId)
                    }
                }}
                isWorker={true}
            />
        </div>
    )
}
