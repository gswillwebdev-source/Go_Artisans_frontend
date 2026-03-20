'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
    const router = useRouter()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        job_title: '',
        location: '',
        bio: '',
        years_experience: 0,
        services: [],
        portfolio: [],
        profile_picture: ''
    })
    const [updateLoading, setUpdateLoading] = useState(false)
    const [updateError, setUpdateError] = useState(null)
    const [updateSuccess, setUpdateSuccess] = useState(false)
    const [newService, setNewService] = useState('')

    useEffect(() => {
        async function initProfile() {
            try {
                setLoading(true)

                // Get current user from Supabase auth
                const { data: { user }, error: authError } = await supabase.auth.getUser()

                if (authError || !user) {
                    router.push('/login')
                    return
                }

                // Fetch user profile from database
                const { data: userData, error: fetchError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (fetchError) throw fetchError

                // Redirect based on user type if needed
                if (userData.user_type === 'worker') {
                    router.push('/worker-profile')
                    return
                } else if (userData.user_type === 'client') {
                    router.push('/client-profile')
                    return
                }

                setProfile(userData)
                setFormData({
                    first_name: userData.first_name || '',
                    last_name: userData.last_name || '',
                    email: userData.email || '',
                    phone_number: userData.phone_number || '',
                    job_title: userData.job_title || '',
                    location: userData.location || '',
                    bio: userData.bio || '',
                    years_experience: userData.years_experience || 0,
                    services: userData.services || [],
                    portfolio: userData.portfolio || [],
                    profile_picture: userData.profile_picture || ''
                })
            } catch (err) {
                console.error('Failed to fetch profile', err)
                setError('Failed to load profile')
            } finally {
                setLoading(false)
            }
        }

        initProfile()
    }, [router])

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : (name === 'years_experience' ? parseInt(value) || 0 : value)
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

    const handleRemoveService = (index) => {
        setFormData({
            ...formData,
            services: formData.services.filter((_, i) => i !== index)
        })
    }

    const handleSaveProfile = async () => {
        try {
            setUpdateLoading(true)
            setUpdateError(null)

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error: updateError } = await supabase
                .from('users')
                .update({
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    phone_number: formData.phone_number,
                    job_title: formData.job_title,
                    location: formData.location,
                    bio: formData.bio,
                    years_experience: formData.years_experience,
                    services: formData.services,
                    portfolio: formData.portfolio,
                    profile_picture: formData.profile_picture
                })
                .eq('id', user.id)

            if (updateError) throw updateError

            setProfile(formData)
            setIsEditing(false)
            setUpdateSuccess(true)
            setTimeout(() => setUpdateSuccess(false), 3000)
        } catch (err) {
            console.error('Failed to update profile', err)
            setUpdateError(err.message || 'Failed to update profile')
        } finally {
            setUpdateLoading(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>
    if (!profile) return <div className="min-h-screen flex items-center justify-center">Profile not found</div>

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
                                    <p className="text-gray-900">{profile.first_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Last Name:</span>
                                    <p className="text-gray-900">{profile.last_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Email:</span>
                                    <p className="text-gray-900">{profile.email}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Phone:</span>
                                    <p className="text-gray-900">{profile.phone_number || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Edit Mode
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                name="first_name"
                                placeholder="First Name"
                                value={formData.first_name}
                                onChange={handleInputChange}
                                className="border p-2 rounded"
                            />
                            <input
                                type="text"
                                name="last_name"
                                placeholder="Last Name"
                                value={formData.last_name}
                                onChange={handleInputChange}
                                className="border p-2 rounded"
                            />
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={formData.email}
                                disabled
                                className="border p-2 rounded bg-gray-100"
                            />
                            <input
                                type="tel"
                                name="phone_number"
                                placeholder="Phone Number"
                                value={formData.phone_number}
                                onChange={handleInputChange}
                                className="border p-2 rounded"
                            />
                            <input
                                type="text"
                                name="job_title"
                                placeholder="Job Title"
                                value={formData.job_title}
                                onChange={handleInputChange}
                                className="col-span-2 border p-2 rounded"
                            />
                            <input
                                type="text"
                                name="location"
                                placeholder="Location"
                                value={formData.location}
                                onChange={handleInputChange}
                                className="col-span-2 border p-2 rounded"
                            />
                            <textarea
                                name="bio"
                                placeholder="Bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                className="col-span-2 border p-2 rounded"
                            />
                            <input
                                type="number"
                                name="years_experience"
                                placeholder="Years of Experience"
                                value={formData.years_experience}
                                onChange={handleInputChange}
                                className="border p-2 rounded"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleSaveProfile}
                                disabled={updateLoading}
                                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                            >
                                {updateLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
