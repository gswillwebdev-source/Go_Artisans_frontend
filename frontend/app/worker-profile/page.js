'use client'

import { useEffect, useState } from 'react'
import apiClient from '@/lib/apiClient'
import completionClient from '@/lib/completionClient'
import RatingModal from '@/components/RatingModal'
import RatingsDisplay from '@/components/RatingsDisplay'
import WorkerRatingsDisplay from '@/components/WorkerRatingsDisplay'
import { togoLocations, handworks } from '@/lib/togoData'
import { useLanguage } from '@/context/LanguageContext'

export default function WorkerProfilePage() {
    const { t } = useLanguage()
    const [profile, setProfile] = useState(null)
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
    const [jobsLoading, setJobsLoading] = useState(false)
    const [emailVerificationCode, setEmailVerificationCode] = useState('')
    const [verifyingEmail, setVerifyingEmail] = useState(false)
    const [emailVerificationError, setEmailVerificationError] = useState('')
    const [emailResendLoading, setEmailResendLoading] = useState(false)
    const [emailResendCooldown, setEmailResendCooldown] = useState(0)
    const [completionStatus, setCompletionStatus] = useState({})
    const [requestingCompletion, setRequestingCompletion] = useState({})
    const [showRatingModal, setShowRatingModal] = useState(false)
    const [ratingCompletionId, setRatingCompletionId] = useState(null)
    const [completionSuccess, setCompletionSuccess] = useState('')

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null

        if (!token) {
            window.location.href = '/login'
            return
        }

        // Check if user is a worker, if not redirect to choose role
        if (userData) {
            const user = JSON.parse(userData)
            if (!user.userType) {
                window.location.href = '/choose-role'
                return
            } else if (user.userType !== 'worker') {
                // User is a client, redirect to client profile
                window.location.href = '/client-profile'
                return
            }
        }

        apiClient.setToken(token)

        async function fetchProfile() {
            let timeoutId;
            let warningTimeoutId;

            try {
                setLoading(true)
                setError(null)
                setTimeoutWarning(false)

                // Show timeout warning after 20 seconds
                warningTimeoutId = setTimeout(() => {
                    setTimeoutWarning(true)
                }, 20000)

                // Main timeout after 30 seconds
                timeoutId = setTimeout(() => {
                    setLoading(false)
                    setError(t('profileTookTooLong'))
                }, 30000)

                const res = await apiClient.getUserProfile()

                clearTimeout(timeoutId)
                clearTimeout(warningTimeoutId)

                let userData = res.data.user || res.data
                // make sure the flag is consistent with userType so the UI sections render
                if (!userData.isWorker && userData.userType === 'worker') {
                    userData = { ...userData, isWorker: true }
                }
                setProfile(userData)

                // Set profile picture
                if (userData.profilePicture) {
                    setProfilePicturePreview(userData.profilePicture)
                }

                // Parse portfolio if it's a JSON string
                let portfolioData = userData.portfolio || []
                if (typeof portfolioData === 'string') {
                    try {
                        portfolioData = JSON.parse(portfolioData)
                    } catch (e) {
                        portfolioData = []
                    }
                }

                // Parse services if it's a JSON string
                let servicesData = userData.services || []
                if (typeof servicesData === 'string') {
                    try {
                        servicesData = JSON.parse(servicesData)
                    } catch (e) {
                        servicesData = []
                    }
                }

                setFormData({
                    email: userData.email || '',
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    phoneNumber: userData.phoneNumber || '',
                    isWorker: userData.isWorker || userData.userType === 'worker' || false,
                    jobTitle: userData.jobTitle || '',
                    location: userData.location || '',
                    bio: userData.bio || '',
                    yearsExperience: userData.yearsExperience || 0,
                    services: servicesData,
                    portfolio: portfolioData,
                    profilePicture: userData.profilePicture || null
                })
                setTimeoutWarning(false)

                // Fetch jobs related to this worker
                try {
                    const jobsRes = await apiClient.getMyApplications()
                    let applications = jobsRes.data?.applications || []

                    // Normalize job_id to id for easier access in the UI
                    applications = applications.map(app => ({
                        ...app,
                        id: app.job_id  // alias job_id to id for button/key references
                    }))

                    // Categorize jobs by status
                    const applied = applications.filter(app => app.status === 'pending')
                    const accepted = applications.filter(app => app.status === 'accepted')
                    const finished = applications.filter(app => app.completion_status === 'confirmed' || app.completion_status === 'completed_and_rated')

                    setAppliedJobs(applied)
                    setPendingJobs(accepted)
                    setFinishedJobs(finished)

                    // also load saved jobs (bookmarks) so the worker can revisit them
                    try {
                        const savedRes = await apiClient.getSavedJobs()
                        setSavedJobs(savedRes.data.jobs || [])
                    } catch (e) {
                        console.error('Failed to fetch saved jobs:', e)
                    }
                } catch (jobErr) {
                    console.error('Failed to fetch jobs:', jobErr)
                }
            } catch (err) {
                clearTimeout(timeoutId)
                clearTimeout(warningTimeoutId)

                console.error('Failed to fetch profile', err)

                let errorMessage = t('failedLoadProfileMsg')
                if (err.code === 'ECONNABORTED') {
                    errorMessage = t('requestTimeoutMsg')
                } else if (err.message === 'Network Error') {
                    errorMessage = t('networkErrorMsg')
                } else if (err.response?.status === 401) {
                    errorMessage = t('unauthorizedMsg')
                } else if (err.response?.status === 500) {
                    errorMessage = t('serverErrorMsg')
                }

                setError(errorMessage)
                setTimeoutWarning(false)
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()
    }, [])

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : (name === 'yearsExperience' ? parseInt(value) || 0 : value)
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

        files.forEach(file => {
            const reader = new FileReader()
            reader.onloadend = () => {
                const dataUrl = reader.result
                setFormData(prev => ({
                    ...prev,
                    portfolio: [...prev.portfolio, dataUrl]
                }))
                setPortfolioFiles(prev => [...prev, {
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
        setPortfolioFiles(portfolioFiles.filter((_, i) => i !== idx))
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
                firstName: formData.firstName,
                lastName: formData.lastName,
                phoneNumber: formData.phoneNumber,
                isWorker: formData.isWorker,
                jobTitle: formData.jobTitle,
                location: formData.location,
                bio: formData.bio,
                yearsExperience: formData.yearsExperience,
                services: formData.services,
                portfolio: portfolioData,
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
            setTimeout(() => setCompletionSuccess(''), 4000)
        } catch (err) {
            console.error('Failed to request completion:', err)
            const errorMessage = err.response?.data?.error || err.message || 'Failed to request completion'
            setUpdateError(errorMessage)
            setTimeout(() => setUpdateError(null), 5000)
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
                loadCompletionStatus(job.id)
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
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white shadow rounded-lg p-8 mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{t('yourWorkerProfile')}</h1>
                            <p className="text-gray-600 mt-1">{t('buildProfessional')}</p>
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
                        <div className="bg-white shadow rounded-lg p-8">
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 bg-indigo-200 rounded-full flex items-center justify-center text-4xl overflow-hidden flex-shrink-0">
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
                                    <p className="text-lg font-semibold text-gray-900">
                                        {profile.firstName} {profile.lastName}
                                    </p>
                                    <p className="text-indigo-600 font-medium">{profile.jobTitle || t('serviceProvider')}</p>
                                    <p className="text-gray-600 text-sm mt-1">{profile.location || t('locationNotSet')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Basic Information */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h3 className="text-lg font-semibold mb-4">{t('basicInformation')}</h3>
                            <div className="grid grid-cols-2 gap-4">
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

                        {profile.isWorker && (
                            <>
                                {/* Professional Profile */}
                                <div className="bg-white shadow rounded-lg p-8">
                                    <h3 className="text-lg font-semibold mb-4">{t('professionalProfile')}</h3>
                                    <div className="grid grid-cols-3 gap-4">
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
                                <div className="bg-white shadow rounded-lg p-8">
                                    <h3 className="text-lg font-semibold mb-4">{t('aboutMe')}</h3>
                                    <p className="text-gray-900">{profile.bio || t('noDescriptionProvided')}</p>
                                </div>

                                {/* Services */}
                                <div className="bg-white shadow rounded-lg p-8">
                                    <h3 className="text-lg font-semibold mb-4">{t('servicesSkills')}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {(profile.services || []).length === 0 ? (
                                            <span className="text-gray-500">{t('noServicesListed')}</span>
                                        ) : (
                                            (profile.services || []).map((s, idx) => (
                                                <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">{s}</span>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Portfolio */}
                                <div className="bg-white shadow rounded-lg p-8">
                                    <h3 className="text-lg font-semibold mb-4">{t('portfolio')}</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {(profile.portfolio || []).length === 0 ? (
                                            <span className="text-gray-500">{t('noPortfolioImages')}</span>
                                        ) : (
                                            (profile.portfolio || []).map((img, idx) => {
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
                                    <h3 className="text-lg font-semibold mb-6">{t('publicRatings')}</h3>
                                    <p className="text-sm text-gray-600 mb-6">
                                        {t('ratingsDescription')}
                                    </p>
                                    <WorkerRatingsDisplay workerId={profile.id} />
                                </div>

                                {/* Jobs Tracking Section */}
                                <div className="bg-white shadow rounded-lg p-8">
                                    <h3 className="text-lg font-semibold mb-6">Job Applications & Status</h3>

                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                        {/* Saved Jobs */}
                                        <div className="border border-teal-200 rounded-lg p-4 bg-teal-50">
                                            <h4 className="font-semibold text-teal-900 mb-3 flex items-center gap-2">
                                                <span className="text-2xl">💾</span> {t('savedJobsCountLabel')}
                                            </h4>
                                            <p className="text-3xl font-bold text-teal-600">{savedJobs.length}</p>
                                            <p className="text-xs text-teal-700 mt-2">{t('savedJobsDescription')}</p>
                                        </div>

                                        {/* Applied Jobs */}
                                        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                                            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                                <span className="text-2xl">📝</span> {t('applied')}
                                            </h4>
                                            <p className="text-3xl font-bold text-blue-600">{appliedJobs.length}</p>
                                            <p className="text-xs text-blue-700 mt-2">{t('pendingReview')}</p>
                                        </div>

                                        {/* Accepted Jobs */}
                                        <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                                            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                                                <span className="text-2xl">✅</span> {t('accepted')}
                                            </h4>
                                            <p className="text-3xl font-bold text-green-600">{pendingJobs.length}</p>
                                            <p className="text-xs text-green-700 mt-2">{t('acceptedJobsDescription')}</p>
                                        </div>

                                        {/* Finished Jobs */}
                                        <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                                            <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                                <span className="text-2xl">🏆</span> {t('completed')}
                                            </h4>
                                            <p className="text-3xl font-bold text-purple-600">{finishedJobs.length}</p>
                                            <p className="text-xs text-purple-700 mt-2">{t('completedJobsDescription')}</p>
                                        </div>
                                    </div>

                                    {/* Saved Jobs Details */}
                                    {savedJobs.length > 0 && (
                                        <div className="mb-6 bg-teal-50 rounded-lg p-4">
                                            <h4 className="font-semibold text-teal-900 mb-3">{t('savedJobs')}</h4>
                                            <div className="space-y-2">
                                                {savedJobs.map(job => (
                                                    <div key={job.id} className="bg-white p-3 rounded border border-teal-200">
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
                                        <div className="mb-6 bg-blue-50 rounded-lg p-4">
                                            <h4 className="font-semibold text-blue-900 mb-3">{t('appliedJobsPending')}</h4>
                                            <div className="space-y-2">
                                                {savedJobs.map(job => (
                                                    <div key={job.job_id || job.id} className="bg-white p-3 rounded border border-blue-200">
                                                        <p className="font-medium text-gray-900">{job.title}</p>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            <span>📍 {job.location}</span>
                                                            {job.salary && <span className="ml-3">💰 CFA {job.salary}</span>}
                                                        </div>
                                                        <div className="text-xs text-blue-600 mt-1">{t('status')}: <span className="font-semibold">{t('pendingReviewStatus')}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Accepted Jobs Details */}
                                    {pendingJobs.length > 0 && (
                                        <div className="mb-6 bg-green-50 rounded-lg p-4">
                                            <h4 className="font-semibold text-green-900 mb-3">{t('acceptedJobsInProgress')}</h4>
                                            <div className="space-y-3">
                                                {pendingJobs.map(job => {
                                                    const jobId = job.job_id || job.id
                                                    const status = completionStatus[jobId] || { status: 'not_requested' }
                                                    const isCompleted = status.status === 'confirmed' || status.status === 'completed_and_rated'

                                                    return (
                                                        <div key={jobId} className="bg-white p-4 rounded border border-green-200">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1">
                                                                    <p className="font-medium text-gray-900">{job.title}</p>
                                                                    <div className="text-xs text-gray-600 mt-1">
                                                                        <span>📍 {job.location}</span>
                                                                        {job.salary && <span className="ml-3">💰 CFA {job.salary}</span>}
                                                                    </div>
                                                                </div>

                                                                {/* Completion Status Indicator */}
                                                                {status.status === 'not_requested' ? (
                                                                    <button
                                                                        onClick={() => handleRequestCompletion(jobId)}
                                                                        disabled={requestingCompletion[jobId]}
                                                                        className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 whitespace-nowrap text-sm"
                                                                    >
                                                                        {requestingCompletion[jobId] ? t('requesting') : t('markAsCompleted')}
                                                                    </button>
                                                                ) : status.status === 'pending' ? (
                                                                    <div className="ml-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm whitespace-nowrap flex items-center gap-2">
                                                                        <span className="animate-spin">⏳</span> {t('pendingReviewStatus')}
                                                                    </div>
                                                                ) : status.status === 'declined' ? (
                                                                    <div className="ml-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm">
                                                                        <p className="font-semibold">{t('declined')}</p>
                                                                        <p className="text-xs mt-1">{status.reason_for_decline}</p>
                                                                    </div>
                                                                ) : isCompleted ? (
                                                                    <div className="ml-4 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm whitespace-nowrap">
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

                                    {/* Finished Jobs Details */}
                                    {finishedJobs.length > 0 && (
                                        <div className="bg-purple-50 rounded-lg p-4">
                                            <h4 className="font-semibold text-purple-900 mb-3">{t('completedJobsLabel')}</h4>
                                            <div className="space-y-2">
                                                {finishedJobs.map(job => (
                                                    <div key={job.job_id || job.id} className="bg-white p-3 rounded border border-purple-200">
                                                        <p className="font-medium text-gray-900">{job.title}</p>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            <span>📍 {job.location}</span>
                                                            {job.salary && <span className="ml-3">💰 CFA {job.salary}</span>}
                                                        </div>
                                                        <div className="text-xs text-purple-600 mt-1">{t('status')}: <span className="font-semibold">{t('completed')}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No Jobs Message */}
                                    {savedJobs.length === 0 && appliedJobs.length === 0 && pendingJobs.length === 0 && finishedJobs.length === 0 && (
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
                        <div className="bg-white shadow rounded-lg p-8">
                            <h3 className="text-lg font-semibold mb-4">{t('profilePictureLabel')}</h3>
                            <div className="flex items-start gap-6">
                                <div className="w-24 h-24 bg-indigo-200 rounded-full flex items-center justify-center text-4xl overflow-hidden flex-shrink-0">
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
                        <div className="bg-white shadow rounded-lg p-8">
                            <h3 className="text-lg font-semibold mb-4">{t('basicInformation')}</h3>
                            <div className="grid grid-cols-2 gap-4">
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
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        placeholder="+228 XXXX XXXX"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Professional Information Edit */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h3 className="text-lg font-semibold mb-4">{t('professionalInfoLabel')}</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
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
                                        <select
                                            name="location"
                                            value={formData.location}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        >
                                            <option value="">{t('selectLocation')}</option>
                                            {togoLocations.map(loc => (
                                                <option key={loc.value} value={loc.value}>{loc.label}</option>
                                            ))}
                                        </select>
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
                        <div className="bg-white shadow rounded-lg p-8">
                            <h3 className="text-lg font-semibold mb-4">{t('servicesHandworks')}</h3>
                            <div className="flex gap-2 mb-2">
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
                        <div className="bg-white shadow rounded-lg p-8">
                            <h3 className="text-lg font-semibold mb-4">{t('portfolioLabel')}</h3>
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
                            <div className="grid grid-cols-3 gap-4">
                                {(formData.portfolio || []).map((img, idx) => {
                                    // Handle both array of strings and array of objects
                                    const imageUrl = typeof img === 'string' ? img : (img?.url || '')
                                    const imageName = typeof img === 'object' ? img.name : ''
                                    const isValidImage = imageUrl && (imageUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(imageUrl))

                                    return (
                                        <div key={idx} className="relative bg-gray-100 h-40 rounded-lg overflow-hidden group border border-gray-200">
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
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={updateLoading}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
                            >
                                {updateLoading ? t('saving') : t('saveChanges')}
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
