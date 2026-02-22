'use client'

import { useEffect, useState } from 'react'
import apiClient from '@/lib/apiClient'

export default function WorkerProfilePage() {
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
                    setError('Profile took too long to load. Please refresh the page.')
                }, 30000)

                const res = await apiClient.getUserProfile()

                clearTimeout(timeoutId)
                clearTimeout(warningTimeoutId)

                const userData = res.data.user || res.data
                setProfile(userData)
                if (userData.profilePicture) {
                    setProfilePicturePreview(userData.profilePicture)
                }
                setFormData({
                    email: userData.email || '',
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    phoneNumber: userData.phoneNumber || '',
                    isWorker: userData.isWorker || false,
                    jobTitle: userData.jobTitle || '',
                    location: userData.location || '',
                    bio: userData.bio || '',
                    yearsExperience: userData.yearsExperience || 0,
                    services: userData.services || [],
                    portfolio: userData.portfolio || [],
                    profilePicture: userData.profilePicture || null
                })
                setTimeoutWarning(false)
            } catch (err) {
                clearTimeout(timeoutId)
                clearTimeout(warningTimeoutId)

                console.error('Failed to fetch profile', err)

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
                            <h1 className="text-3xl font-bold text-gray-900">Your Worker Profile</h1>
                            <p className="text-gray-600 mt-1">Build your professional presence and attract clients</p>
                        </div>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {updateSuccess && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4">
                            ✓ Profile updated successfully!
                        </div>
                    )}

                    {updateError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
                            {updateError}
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
                                            alt="Profile"
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
                                    <p className="text-indigo-600 font-medium">{profile.jobTitle || 'Service Provider'}</p>
                                    <p className="text-gray-600 text-sm mt-1">{profile.location || 'Location not set'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Basic Information */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="font-medium text-gray-700">First Name:</span>
                                    <p className="text-gray-900">{profile.firstName || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Last Name:</span>
                                    <p className="text-gray-900">{profile.lastName || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Email:</span>
                                    <p className="text-gray-900">{profile.email}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Phone:</span>
                                    <p className="text-gray-900">{profile.phoneNumber || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {profile.isWorker && (
                            <>
                                {/* Professional Profile */}
                                <div className="bg-white shadow rounded-lg p-8">
                                    <h3 className="text-lg font-semibold mb-4">Professional Profile</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <span className="font-medium text-gray-700">Job Title:</span>
                                            <p className="text-gray-900">{profile.jobTitle || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">Location:</span>
                                            <p className="text-gray-900">{profile.location || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">Years of Experience:</span>
                                            <p className="text-gray-900">{profile.yearsExperience || 0} years</p>
                                        </div>
                                    </div>
                                </div>

                                {/* About Me */}
                                <div className="bg-white shadow rounded-lg p-8">
                                    <h3 className="text-lg font-semibold mb-4">About Me</h3>
                                    <p className="text-gray-900">{profile.bio || 'No description provided.'}</p>
                                </div>

                                {/* Services */}
                                <div className="bg-white shadow rounded-lg p-8">
                                    <h3 className="text-lg font-semibold mb-4">Services / Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {(profile.services || []).length === 0 ? (
                                            <span className="text-gray-500">No services listed.</span>
                                        ) : (
                                            (profile.services || []).map((s, idx) => (
                                                <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">{s}</span>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Portfolio */}
                                <div className="bg-white shadow rounded-lg p-8">
                                    <h3 className="text-lg font-semibold mb-4">Portfolio / Gallery</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {(profile.portfolio || []).length === 0 ? (
                                            <span className="text-gray-500">No portfolio images.</span>
                                        ) : (
                                            (profile.portfolio || []).map((img, idx) => {
                                                const isImageUrl = typeof img === 'string' && /\.(jpg|jpeg|png|gif|webp|svg|data:)/.test(img)

                                                return (
                                                    <div key={idx} className="bg-gray-200 h-40 rounded-lg flex items-center justify-center overflow-hidden">
                                                        {isImageUrl ? (
                                                            <img src={img} alt={`portfolio-${idx}`} className="w-full h-full object-cover" />
                                                        ) : typeof img === 'object' && img.url ? (
                                                            <img src={img.url} alt={`portfolio-${idx}`} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-gray-600 text-sm text-center p-2">{typeof img === 'object' ? img.name : 'Portfolio Item'}</span>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    // Edit Mode
                    <form onSubmit={handleUpdate} className="space-y-6">
                        {/* Profile Picture Edit */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h3 className="text-lg font-semibold mb-4">Profile Picture</h3>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo</label>
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
                            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
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
                            <h3 className="text-lg font-semibold mb-4">Professional Information</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                        <input
                                            type="text"
                                            name="jobTitle"
                                            value={formData.jobTitle}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Electrician, Plumber"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                        <input
                                            type="text"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Lomé – Baguida"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio / About You</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                        rows="4"
                                        placeholder="Describe your experience, skills, and what makes you great..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Be convincing to attract more clients!</p>
                                </div>
                            </div>
                        </div>

                        {/* Services Edit */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h3 className="text-lg font-semibold mb-4">Services / Skills You Offer</h3>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={newService}
                                    onChange={(e) => setNewService(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddService())}
                                    placeholder="e.g., Pipe installation, Leak repair"
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddService}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Add Service
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
                            <h3 className="text-lg font-semibold mb-4">Portfolio / Gallery</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photos of Your Work</label>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handlePortfolioChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer"
                                />
                                <p className="text-xs text-gray-500 mt-2">Upload 3+ photos to showcase your work (JPG, PNG)</p>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {(formData.portfolio || []).map((img, idx) => {
                                    const isImageUrl = typeof img === 'string' && /\.(jpg|jpeg|png|gif|webp|svg|data:)/.test(img)

                                    return (
                                        <div key={idx} className="relative bg-gray-200 h-40 rounded-lg overflow-hidden group">
                                            {isImageUrl ? (
                                                <img src={img} alt={`portfolio-${idx}`} className="w-full h-full object-cover" />
                                            ) : typeof img === 'object' && img.url ? (
                                                <img src={img.url} alt={`portfolio-${idx}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm text-center p-2">
                                                    {typeof img === 'object' ? img.name : 'Portfolio Item'}
                                                </div>
                                            )}
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
                                {updateLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
