'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'

export default function ProfilePage() {
    const router = useRouter()
    const { t } = useLanguage()
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
                    .select('id,user_type,email,first_name,last_name,phone_number,job_title,location,bio,years_experience,services,portfolio,profile_picture')
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
                setError(t('failedLoadProfileMsg'))
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

            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                throw new Error('NETWORK_OFFLINE')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const nextBasePayload = {
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

            if (Object.keys(updatePayload).length === 0) {
                setIsEditing(false)
                setUpdateSuccess(true)
                setTimeout(() => setUpdateSuccess(false), 3000)
                return
            }

            const { error: updateError } = await supabase
                .from('users')
                .update(updatePayload)
                .eq('id', user.id)

            if (updateError) throw updateError

            setProfile(prev => ({ ...(prev || {}), ...updatePayload }))
            setIsEditing(false)
            setUpdateSuccess(true)
            setTimeout(() => setUpdateSuccess(false), 3000)
        } catch (err) {
            console.error('Failed to update profile', err)
            if (
                /NETWORK_OFFLINE|Failed to fetch|NetworkError|ERR_INTERNET_DISCONNECTED/i.test(err?.message || '')
                || err?.name === 'TypeError'
            ) {
                setUpdateError(t('networkErrorMsg') || 'Network error. Please check your connection and try again.')
            } else {
                setUpdateError(err.message || t('profileUpdateFailed'))
            }
        } finally {
            setUpdateLoading(false)
        }
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-slate-600 font-semibold">{t('loadingProfile')}</div>
    }

    if (error) {
        return <div className="min-h-screen flex items-center justify-center text-red-600 font-semibold">{error}</div>
    }

    if (!profile) {
        return <div className="min-h-screen flex items-center justify-center text-slate-600 font-semibold">{t('profileNotFound')}</div>
    }

    return (
        <div className="profile-page">
            <div className="profile-container space-y-6">
                <div className="profile-hero fade-in-up">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <span className="profile-chip mb-3">{t('profile')}</span>
                            <h1 className="profile-title text-3xl sm:text-4xl font-bold text-slate-900">{t('yourProfile')}</h1>
                            <p className="profile-muted mt-2">{t('manageInformation')}</p>
                        </div>
                        {!isEditing && (
                            <div className="profile-actions lg:justify-end">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="primary-action px-4 py-2 rounded-xl font-semibold shadow-sm"
                                >
                                    {t('editProfile')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {updateSuccess && (
                    <div className="bg-green-50 text-green-700 p-3 rounded-xl border border-green-200">
                        {t('profileUpdatedSuccess')}
                    </div>
                )}

                {updateError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-200">
                        {updateError}
                    </div>
                )}

                {!isEditing ? (
                    <div className="space-y-6">
                        <div className="profile-section profile-section-soft">
                            <h2 className="profile-title text-xl font-semibold mb-5">{t('basicInformation')}</h2>
                            <div className="profile-grid-2">
                                <div>
                                    <span className="font-medium text-gray-700">{t('firstName')}:</span>
                                    <p className="text-gray-900 mt-1">{profile.first_name || t('notProvided')}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">{t('lastName')}:</span>
                                    <p className="text-gray-900 mt-1">{profile.last_name || t('notProvided')}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">{t('email')}:</span>
                                    <p className="text-gray-900 mt-1">{profile.email || t('notProvided')}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">{t('phone')}:</span>
                                    <p className="text-gray-900 mt-1">{profile.phone_number || t('notProvided')}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">{t('jobTitle')}:</span>
                                    <p className="text-gray-900 mt-1">{profile.job_title || t('notProvided')}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">{t('location')}:</span>
                                    <p className="text-gray-900 mt-1">{profile.location || t('notProvided')}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">{t('years')}:</span>
                                    <p className="text-gray-900 mt-1">{profile.years_experience || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="profile-section">
                            <h2 className="profile-title text-xl font-semibold mb-5">{t('aboutMe')}</h2>
                            <p className="text-gray-700 whitespace-pre-wrap">{profile.bio || t('notProvided')}</p>
                        </div>
                    </div>
                ) : (
                    <div className="profile-section space-y-6">
                        <div className="profile-grid-2">
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleInputChange}
                                className="border border-gray-300 p-3 rounded-xl"
                                placeholder={t('firstName')}
                            />
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleInputChange}
                                className="border border-gray-300 p-3 rounded-xl"
                                placeholder={t('lastName')}
                            />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                disabled
                                className="border border-gray-300 p-3 rounded-xl bg-gray-100"
                                placeholder={t('email')}
                            />
                            <input
                                type="tel"
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleInputChange}
                                className="border border-gray-300 p-3 rounded-xl"
                                placeholder={t('phoneNumber')}
                            />
                            <input
                                type="text"
                                name="job_title"
                                value={formData.job_title}
                                onChange={handleInputChange}
                                className="border border-gray-300 p-3 rounded-xl"
                                placeholder={t('jobTitle')}
                            />
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                className="border border-gray-300 p-3 rounded-xl"
                                placeholder={t('location')}
                            />
                            <input
                                type="number"
                                name="years_experience"
                                value={formData.years_experience}
                                onChange={handleInputChange}
                                className="border border-gray-300 p-3 rounded-xl"
                                placeholder={t('yearsExperience')}
                            />
                            <div />
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                className="sm:col-span-2 border border-gray-300 p-3 rounded-xl min-h-[140px]"
                                placeholder={t('bio')}
                            />
                        </div>

                        <div className="profile-actions">
                            <button
                                onClick={handleSaveProfile}
                                disabled={updateLoading}
                                className="primary-action px-6 py-2.5 rounded-xl font-medium disabled:opacity-50"
                            >
                                {updateLoading ? t('saving') : t('saveChanges')}
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="profile-button-secondary px-6 py-2.5 rounded-xl font-medium"
                            >
                                {t('cancel')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
