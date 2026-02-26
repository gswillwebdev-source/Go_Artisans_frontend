'use client'

import { useEffect, useState } from 'react'
import apiClient from '@/lib/apiClient'

export default function ProfilePage() {
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
        portfolio: []
    })
    const [updateLoading, setUpdateLoading] = useState(false)
    const [updateError, setUpdateError] = useState(null)
    const [updateSuccess, setUpdateSuccess] = useState(false)
    const [profilePicture, setProfilePicture] = useState(null)
    const [newService, setNewService] = useState('')
    const [portfolioFiles, setPortfolioFiles] = useState([])

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) {
            window.location.href = '/login'
            return
        }

        // Check user type and redirect as needed
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        if (userData) {
            try {
                const user = JSON.parse(userData)
                // If user has a specific role, redirect to their profile type
                if (user.userType === 'worker') {
                    window.location.href = '/worker-profile'
                    return
                } else if (user.userType === 'client') {
                    window.location.href = '/client-profile'
                    return
                }
            } catch (e) {
                console.error('Error parsing user data:', e)
            }
        }

        apiClient.setToken(token)

        async function fetchProfile() {
            try {
                setLoading(true)
                const res = await apiClient.getUserProfile()
                const userData = res.data.user || res.data
                setProfile(userData)
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
                    portfolio: userData.portfolio || []
                })
            } catch (err) {
                console.error('Failed to fetch profile', err)
                setError('Failed to load profile')
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
        const newPortfolio = files.map(file => ({
            name: file.name,
            url: URL.createObjectURL(file),
            file: file
        }))
        setPortfolioFiles([...portfolioFiles, ...newPortfolio])
        setFormData({
            ...formData,
            portfolio: [...formData.portfolio, ...newPortfolio]
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
            // Prepare portfolio data - keep only the data part
            const portfolioData = formData.portfolio.map(p => {
                if (typeof p === 'string') return p
                return p.url || p.name
            })

            const updatePayload = {
                ...formData,
                portfolio: portfolioData
            }

            const res = await apiClient.updateUserProfile(updatePayload)
            const updatedUser = res.data.user || res.data
            setProfile(updatedUser)
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

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>
    if (error) return <div className="min-h-screen flex items-center justify-center">{error}</div>

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Your Profile</h2>
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
                        Profile updated successfully!
                    </div>
                )}

                {updateError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
                        {updateError}
                    </div>
                )}

                {!isEditing ? (
                    // View Mode
                    <div className="space-y-6">
                        <div className="border-b pb-4">
                            <h3 className="text-lg font-semibold">Basic Information</h3>
                            <div className="grid grid-cols-2 gap-4 mt-3">
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
                                <div className="border-b pb-4">
                                    <h3 className="text-lg font-semibold">Professional Profile</h3>
                                    <div className="grid grid-cols-2 gap-4 mt-3">
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

                                <div className="border-b pb-4">
                                    <h3 className="text-lg font-semibold">About Me</h3>
                                    <p className="text-gray-900 mt-2">{profile.bio || 'No description provided.'}</p>
                                </div>

                                <div className="border-b pb-4">
                                    <h3 className="text-lg font-semibold">Services / Skills</h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(profile.services || []).length === 0 ? (
                                            <span className="text-gray-500">No services listed.</span>
                                        ) : (
                                            (profile.services || []).map((s, idx) => (
                                                <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">{s}</span>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold">Portfolio / Gallery</h3>
                                    <div className="grid grid-cols-3 gap-4 mt-3">
                                        {(profile.portfolio || []).length === 0 ? (
                                            <span className="text-gray-500">No portfolio images.</span>
                                        ) : (
                                            (profile.portfolio || []).map((img, idx) => (
                                                <div key={idx} className="bg-gray-200 h-40 rounded-lg flex items-center justify-center">
                                                    <span className="text-gray-600 text-sm">{typeof img === 'string' ? img : img.name}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    // Edit Mode
                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div>
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

                        <div className="border-t pt-6">
                            <div className="flex items-center gap-4 mb-4">
                                <input
                                    type="checkbox"
                                    name="isWorker"
                                    checked={formData.isWorker}
                                    onChange={handleInputChange}
                                    className="w-4 h-4"
                                />
                                <label className="font-medium text-gray-700">Set up as a Service Provider (Worker)</label>
                            </div>

                            {formData.isWorker && (
                                <>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title (e.g., Plumber, Electrician)</label>
                                            <input
                                                type="text"
                                                name="jobTitle"
                                                value={formData.jobTitle}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                                placeholder="e.g., Home Plumber"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Location (e.g., Lomé – Baguida)</label>
                                            <input
                                                type="text"
                                                name="location"
                                                value={formData.location}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                                placeholder="e.g., Lomé – Baguida"
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

                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio / About You</label>
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleInputChange}
                                            rows="4"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                            placeholder="Describe your experience, skills, and what makes you great at what you do..."
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Be convincing and persuasive to attract clients!</p>
                                    </div>

                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Services / Skills You Offer</label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={newService}
                                                onChange={(e) => setNewService(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddService())}
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                                placeholder="e.g., Pipe installation, Leak repair"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddService}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(formData.services || []).map((s, idx) => (
                                                <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm flex items-center gap-2">
                                                    {s}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveService(idx)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio / Gallery (Upload at least 3 photos of past work)</label>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handlePortfolioChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        />
                                        <div className="grid grid-cols-3 gap-4 mt-3">
                                            {(formData.portfolio || []).map((img, idx) => (
                                                <div key={idx} className="relative bg-gray-200 h-40 rounded-lg flex items-center justify-center overflow-hidden">
                                                    {typeof img === 'object' && img.url ? (
                                                        <img src={img.url} alt={`portfolio-${idx}`} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-gray-600 text-sm text-center p-2">{typeof img === 'string' ? img : img.name}</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePortfolio(idx)}
                                                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4 border-t">
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

