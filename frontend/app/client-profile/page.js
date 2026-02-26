'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import apiClient from '@/lib/apiClient'
import completionClient from '@/lib/completionClient'
import RatingModal from '@/components/RatingModal'
import DeclineReasonModal from '@/components/DeclineReasonModal'
import RatingsDisplay from '@/components/RatingsDisplay'
import { useLanguage } from '@/context/LanguageContext'
import { togoLocations, handworks } from '@/lib/togoData'

export default function ClientProfilePage() {
    const { t } = useLanguage()
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
    const [completionStatus, setCompletionStatus] = useState({})
    const [showRatingModal, setShowRatingModal] = useState(false)
    const [ratingCompletionId, setRatingCompletionId] = useState(null)
    const [showDeclineModal, setShowDeclineModal] = useState(false)
    const [declineCompletionId, setDeclineCompletionId] = useState(null)

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null

        if (!token) {
            window.location.href = '/login'
            return
        }

        // Check if user is a client, if not redirect to choose role
        if (userData) {
            const user = JSON.parse(userData)
            if (!user.userType) {
                window.location.href = '/choose-role'
                return
            } else if (user.userType !== 'client') {
                // User is a worker, redirect to worker profile
                window.location.href = '/worker-profile'
                return
            }
        }

        apiClient.setToken(token)

        async function fetchData() {
            let timeoutId;
            let warningTimeoutId;

            try {
                setLoading(true)
                setJobsLoading(true)
                setError(null)
                setTimeoutWarning(false)

                // Show timeout warning after 20 seconds
                warningTimeoutId = setTimeout(() => {
                    setTimeoutWarning(true)
                }, 20000)

                // Main timeout after 30 seconds
                timeoutId = setTimeout(() => {
                    setLoading(false)
                    setJobsLoading(false)
                    setError('Profile took too long to load. Please refresh the page.')
                }, 30000)

                // Fetch profile and jobs in parallel for better performance
                const [profileRes, jobsRes] = await Promise.all([
                    apiClient.getUserProfile(),
                    apiClient.getMyJobs()
                ])

                clearTimeout(timeoutId)
                clearTimeout(warningTimeoutId)

                const userData = profileRes.data.user || profileRes.data
                setProfile(userData)
                if (userData.profilePicture) {
                    setProfilePicturePreview(userData.profilePicture)
                }
                setFormData({
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    email: userData.email || '',
                    phoneNumber: userData.phoneNumber || '',
                    location: userData.location || '',
                    bio: userData.bio || '',
                    profilePicture: userData.profilePicture || null
                })

                setJobs(jobsRes.data.jobs || [])
                setTimeoutWarning(false)

                // Extract completion status from jobs that now include worker_id
                const completionStatusMap = {}
                const jobsWithCompletions = jobsRes.data.jobs?.filter(job => job.worker_id && job.completion_id) || []
                jobsWithCompletions.forEach(job => {
                    completionStatusMap[job.id] = {
                        id: job.completion_id,
                        job_id: job.id,
                        worker_id: job.worker_id,
                        status: job.completion_status
                    }
                })
                if (Object.keys(completionStatusMap).length > 0) {
                    setCompletionStatus(completionStatusMap)
                    console.log('Completion status from jobs:', completionStatusMap)
                }

                // Fetch applicants for all jobs
                try {
                    const applicantsRes = await apiClient.getAllJobApplicants()
                    const applicantsMap = {}
                    if (applicantsRes.data.applications) {
                        applicantsRes.data.applications.forEach(applicant => {
                            if (!applicantsMap[applicant.job_id]) {
                                applicantsMap[applicant.job_id] = []
                            }
                            applicantsMap[applicant.job_id].push(applicant)
                        })
                    }
                    setJobApplicants(applicantsMap)
                } catch (err) {
                    console.error('Failed to fetch applicants', err)
                    setApplicantsError('Failed to load applicants')
                }
            } catch (err) {
                clearTimeout(timeoutId)
                clearTimeout(warningTimeoutId)

                console.error('Failed to fetch data', err)

                let errorMessage = 'Failed to load profile'
                if (err.code === 'ECONNABORTED') {
                    errorMessage = 'Request timeout. The server is not responding. Please check your connection.'
                } else if (err.message === 'Network Error') {
                    errorMessage = 'Network error. Please check your internet connection.'
                } else if (err.response?.status === 401) {
                    errorMessage = 'Unauthorized. Please login again.'
                } else if (err.response?.status === 500) {
                    errorMessage = 'Server error. Please try again later.'
                }

                setError(errorMessage)
                setTimeoutWarning(false)
            } finally {
                setLoading(false)
                setJobsLoading(false)
            }
        }

        fetchData()
    }, [])

    // Handle email resend cooldown timer
    useEffect(() => {
        if (emailResendCooldown > 0) {
            const timer = setTimeout(() => {
                setEmailResendCooldown(emailResendCooldown - 1)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [emailResendCooldown])

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
            if (editingJobId) {
                // Update existing job
                const res = await apiClient.updateJob(editingJobId, jobFormData)
                setJobs(jobs.map(j => j.id === editingJobId ? res.data : j))
                setEditingJobId(null)
            } else {
                // Create new job
                const res = await apiClient.createJob(jobFormData)
                setJobs([res.data, ...jobs])
            }

            setJobFormData({ title: '', description: '', location: '', jobType: '', salary: '' })
            setShowJobModal(false)
            setJobFormSuccess(true)
            setTimeout(() => setJobFormSuccess(false), 3000)
        } catch (err) {
            console.error('Failed to save job', err)
            setJobFormError(err.response?.data?.error || 'Failed to save job')
        }
    }

    const handleEditJob = (job) => {
        setJobFormData({
            title: job.title,
            description: job.description,
            location: job.location,
            jobType: job.job_type,
            salary: job.salary
        })
        setEditingJobId(job.id)
        setShowJobModal(true)
    }

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this project?')) return

        try {
            await apiClient.deleteJob(jobId)
            setJobs(jobs.filter(j => j.id !== jobId))
        } catch (err) {
            console.error('Failed to delete job', err)
            alert('Failed to delete project')
        }
    }

    const handleUpdateApplicationStatus = async (appId, newStatus) => {
        try {
            await apiClient.updateApplicationStatus(appId, newStatus)
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
            alert('Failed to update application status')
        }
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        setUpdateLoading(true)
        setUpdateError(null)
        setUpdateSuccess(false)

        try {
            const updatePayload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phoneNumber: formData.phoneNumber,
                location: formData.location,
                bio: formData.bio,
                profilePicture: formData.profilePicture
            }

            const res = await apiClient.updateUserProfile(updatePayload)
            const updatedUser = res.data.user || res.data
            setProfile(updatedUser)
            if (updatedUser.profilePicture) {
                setProfilePicturePreview(updatedUser.profilePicture)
            }
            setIsEditing(false)
            setUpdateSuccess(true)
            setTimeout(() => setUpdateSuccess(false), 3000)
        } catch (err) {
            console.error('Failed to update profile', err)
            setUpdateError(err.response?.data?.error || 'Failed to update profile')
        } finally {
            setUpdateLoading(false)
        }
    }

    const handleVerifyEmail = async (e) => {
        e.preventDefault()
        setVerifyingEmail(true)
        setEmailVerificationError('')
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ verificationCode: emailVerificationCode })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Verification failed')
            }

            // Update profile to show email verified
            const userData = JSON.parse(localStorage.getItem('user') || '{}')
            userData.emailVerified = true
            localStorage.setItem('user', JSON.stringify(userData))

            setProfile(prev => ({ ...prev, emailVerified: true }))
            setEmailVerificationCode('')
            setUpdateSuccess(true)
            setTimeout(() => setUpdateSuccess(false), 3000)
        } catch (err) {
            setEmailVerificationError(err.message || 'Failed to verify email')
        } finally {
            setVerifyingEmail(false)
        }
    }

    const handleResendVerificationEmail = async () => {
        setEmailResendLoading(true)
        setEmailVerificationError('')
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-verification-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to resend code')
            }

            setUpdateSuccess(true)
            setEmailResendCooldown(60)
            setTimeout(() => setUpdateSuccess(false), 3000)
        } catch (err) {
            setEmailVerificationError(err.message || 'Failed to resend verification code')
        } finally {
            setEmailResendLoading(false)
        }
    }

    const handleConfirmCompletion = async (completionId) => {
        try {
            await completionClient.confirmCompletion(completionId)
            // Find the job_id for this completion
            const jobId = Object.keys(completionStatus).find(key => completionStatus[key].id === completionId)
            if (jobId) {
                setCompletionStatus(prev => ({
                    ...prev,
                    [jobId]: { ...prev[jobId], status: 'confirmed' }
                }))
            }
            setRatingCompletionId(completionId)
            setShowRatingModal(true)
            setUpdateSuccess(true)
            setTimeout(() => setUpdateSuccess(false), 3000)
        } catch (err) {
            setUpdateError(err.message || 'Failed to confirm completion')
            setTimeout(() => setUpdateError(null), 3000)
        }
    }

    const handleDeclineCompletion = (completionId) => {
        setDeclineCompletionId(completionId)
        setShowDeclineModal(true)
    }

    const handleDeclineSubmit = async () => {
        // The modal will handle the actual submission
        // Just refresh the completion status after
        if (declineCompletionId) {
            try {
                // Find the job_id for this completion
                const jobId = Object.keys(completionStatus).find(key => completionStatus[key].id === declineCompletionId)
                if (jobId) {
                    const response = await completionClient.getCompletionStatus(jobId)
                    const status = response.data || response
                    if (status && status.id) {
                        setCompletionStatus(prev => ({
                            ...prev,
                            [jobId]: status
                        }))
                    }
                }
            } catch (err) {
                console.error('Failed to refresh completion status:', err)
            }
        }
    }

    const loadCompletionStatus = async (jobId) => {
        try {
            const response = await completionClient.getCompletionStatus(jobId)
            const status = response.data || response
            if (status && status.id) {
                setCompletionStatus(prev => ({
                    ...prev,
                    [jobId]: status
                }))
            }
        } catch (err) {
            console.error('Failed to load completion status:', err)
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
                    {profile && !profile.emailVerified && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r">
                            <div className="flex items-start">
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-yellow-800 mb-2">{t('verifyYourEmail')}</h3>
                                    <p className="text-sm text-yellow-700 mb-4">
                                        {t('verifySixDigitCode').replace('{{email}}', profile.email)}
                                    </p>
                                    <form onSubmit={handleVerifyEmail} className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={emailVerificationCode}
                                            onChange={(e) => setEmailVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000000"
                                            maxLength="6"
                                            className="w-32 px-3 py-2 border border-yellow-300 rounded text-center text-lg tracking-widest font-mono"
                                            required
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
                                        {profile?.firstName} {profile?.lastName}
                                    </p>
                                    <p className="text-gray-600 text-sm mt-1">{profile?.location || t('notProvided')}</p>
                                    <p className="text-sm text-gray-500 mt-2">{t('memberSince').replace('{{date}}', new Date(profile?.createdAt).toLocaleDateString())}</p>
                                </div>
                            </div>
                        </div>

                        {/* Basic Information Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">{t('basicInformation')}</h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">{t('firstName')}</label>
                                    <p className="text-gray-900 mt-1">{profile?.firstName || t('notProvided')}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">{t('lastName')}</label>
                                    <p className="text-gray-900 mt-1">{profile?.lastName || t('notProvided')}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">{t('email')}</label>
                                    <p className="text-gray-900 mt-1">{profile?.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">{t('phoneNumber')}</label>
                                    <p className="text-gray-900 mt-1">{profile?.phoneNumber || t('notProvided')}</p>
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
                                                    <p className="text-sm text-gray-900 mt-1">{job.job_type || t('notSpecified')}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-gray-600 uppercase">{t('hiringRate')}</span>
                                                    <p className="text-sm text-gray-900 mt-1 font-semibold">{job.salary || t('negotiable')}</p>
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
                        <div className="bg-white shadow rounded-lg p-8 mb-8">
                            <h2 className="text-xl font-semibold mb-6">{t('activeProjectsCompletion')}</h2>

                            {jobs.filter(job => job.worker_id).length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-4">🔄</div>
                                    <p className="text-gray-600">{t('noActiveProjectsCompletion')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {jobs.filter(job => job.worker_id).map(job => {
                                        const completion = completionStatus[job.id]

                                        if (!completion) {
                                            return (
                                                <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900">{job.title}</h3>
                                                            <p className="text-sm text-gray-600 mt-1">{t('waitingForWorkerCompletion')}</p>
                                                        </div>
                                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{t('inProgress')}</span>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        return (
                                            <div key={job.id} className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{job.title}</h3>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {completion.status === 'pending' ? `⏳ ${t('workerCompletedAwaiting')}` : ''}
                                                        </p>
                                                    </div>
                                                    {completion.status === 'pending' && (
                                                        <span className="px-3 py-1 bg-yellow-200 text-yellow-900 rounded-full text-xs font-medium animate-pulse">{t('needsReview')}</span>
                                                    )}
                                                </div>

                                                {completion.status === 'pending' && (
                                                    <div className="bg-white p-4 rounded mb-4 border border-yellow-200">
                                                        <p className="text-sm text-gray-700 mb-4">
                                                            <strong>{t('whyRateEachOther')}</strong> {t('ratingHelpWorkers')}
                                                        </p>
                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={() => handleConfirmCompletion(completion.id)}
                                                                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
                                                            >
                                                                ✓ {t('confirmCompleted')}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeclineCompletion(completion.id)}
                                                                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium"
                                                            >
                                                                ✕ {t('decline')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
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
                                                                            applicant.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                                applicant.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                                                    'bg-yellow-100 text-yellow-800'
                                                                            }`}>
                                                                            {applicant.status}
                                                                        </span>
                                                                        <div className="flex gap-1">
                                                                            <Link
                                                                                href={`/workers/${applicant.user_id}`}
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
                                                                                    className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs hover:bg-green-100 transition font-medium"
                                                                                >
                                                                                    ✓ {t('acceptApplicant')}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleUpdateApplicationStatus(applicant.id, 'rejected')}
                                                                                    className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs hover:bg-red-100 transition font-medium"
                                                                                >
                                                                                    ✕ {t('rejectApplicant')}
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
                onClose={() => setShowRatingModal(false)}
                onSuccess={() => {
                    // Reload completion status
                    if (ratingCompletionId) {
                        const jobId = Object.keys(completionStatus).find(key => completionStatus[key].id === ratingCompletionId)
                        if (jobId) {
                            loadCompletionStatus(jobId)
                        }
                    }
                }}
                isWorker={false}
            />

            {/* Decline Reason Modal */}
            <DeclineReasonModal
                completionId={declineCompletionId}
                isOpen={showDeclineModal}
                onClose={() => setShowDeclineModal(false)}
                onSuccess={handleDeclineSubmit}
            />
        </div>
    )
}
