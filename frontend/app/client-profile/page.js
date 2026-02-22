'use client'

import { useEffect, useState } from 'react'
import apiClient from '@/lib/apiClient'

export default function ClientProfilePage() {
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
                            <h1 className="text-3xl font-bold text-gray-900">Your Client Profile</h1>
                            <p className="text-gray-600 mt-1">Manage your information and find the help you need</p>
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
                            Profile updated successfully!
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
                                    <p className="text-gray-600 text-sm mt-1">{profile?.location || 'Location not set'}</p>
                                    <p className="text-sm text-gray-500 mt-2">Member since {new Date(profile?.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Basic Information Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">Basic Information</h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">First Name</label>
                                    <p className="text-gray-900 mt-1">{profile?.firstName || 'Not provided'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Last Name</label>
                                    <p className="text-gray-900 mt-1">{profile?.lastName || 'Not provided'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Email</label>
                                    <p className="text-gray-900 mt-1">{profile?.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Phone</label>
                                    <p className="text-gray-900 mt-1">{profile?.phoneNumber || 'Not provided'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Location</label>
                                    <p className="text-gray-900 mt-1">{profile?.location || 'Not provided'}</p>
                                </div>
                            </div>
                        </div>

                        {/* About Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">About You</h2>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Skills You Need</label>
                                <p className="text-gray-900 mt-2 whitespace-pre-wrap">
                                    {profile?.bio || 'Not provided'}
                                </p>
                            </div>
                        </div>

                        {/* Your Projects Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold">Your Projects</h2>
                                <button
                                    onClick={() => {
                                        setEditingJobId(null)
                                        setJobFormData({ title: '', description: '', location: '', jobType: '', salary: '' })
                                        setShowJobModal(true)
                                    }}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
                                >
                                    Post New Project
                                </button>
                            </div>

                            {jobsLoading ? (
                                <div className="text-center py-12">Loading projects...</div>
                            ) : jobs.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-4">📋</div>
                                    <p className="text-gray-600">No projects posted yet</p>
                                    <p className="text-sm text-gray-500 mt-2">Start by posting your first project to find service providers</p>
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
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteJob(job.id)}
                                                        className="bg-red-50 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-100 transition"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-gray-700 mt-3">{job.description}</p>
                                            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-200">
                                                <div>
                                                    <span className="text-xs font-medium text-gray-600 uppercase">Type</span>
                                                    <p className="text-sm text-gray-900 mt-1">{job.job_type || 'Not specified'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-gray-600 uppercase">Hiring Rate</span>
                                                    <p className="text-sm text-gray-900 mt-1 font-semibold">{job.salary || 'Negotiable'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-gray-600 uppercase">Posted</span>
                                                    <p className="text-sm text-gray-900 mt-1">{new Date(job.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // Edit Mode
                    <form onSubmit={handleUpdate} className="space-y-6">
                        {/* Edit Profile Picture Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">Profile Picture</h2>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleProfilePictureChange}
                                        className="block text-sm text-gray-500 border border-gray-300 rounded px-3 py-2"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF (max 5MB)</p>
                                </div>
                            </div>
                        </div>

                        {/* Edit Basic Information Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">Basic Information</h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                        placeholder="e.g., Lomé, Togo"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Edit About Section */}
                        <div className="bg-white shadow rounded-lg p-8">
                            <h2 className="text-xl font-semibold mb-6">About You</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Skills You Need</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    rows="4"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                    placeholder="Describe the skills and services you're looking for. Example: I need a web developer to build an ecommerce site, a designer for logos, etc."
                                />
                                <p className="text-xs text-gray-500 mt-2">Help service providers understand what you need</p>
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
                                        <input
                                            type="text"
                                            name="location"
                                            value={jobFormData.location}
                                            onChange={handleJobInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                            placeholder="e.g., Lomé, Remote"
                                        />
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
        </div>
    )
}
