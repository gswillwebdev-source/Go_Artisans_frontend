'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { handworks, togoLocations, getLocationsForProfile } from '@/lib/togoData'
import { useLanguage } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'

export default function PostJobModal({ onClose, onPosted }) {
    const { t } = useLanguage()
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isClient, setIsClient] = useState(false)
    const [availableLocations, setAvailableLocations] = useState(togoLocations)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [form, setForm] = useState({
        title: '',
        description: '',
        budget: '',
        location: '',
        category: '',
    })

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user: sessionUser } } = await supabase.auth.getUser()
            if (!sessionUser) {
                router.push('/login')
                return
            }
            const { data: profile } = await supabase
                .from('users')
                .select('user_type, location')
                .eq('id', sessionUser.id)
                .single()
            setUser(sessionUser)
            setIsClient(profile?.user_type === 'client')
            setAvailableLocations(getLocationsForProfile(profile?.location))
        }
        checkUser()
    }, [router])

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.title.trim() || !form.description.trim()) {
            setError('Title and description are required.')
            return
        }
        try {
            setLoading(true)
            setError(null)
            const { error: insertError } = await supabase.from('jobs').insert([{
                title: form.title.trim(),
                description: form.description.trim(),
                budget: form.budget ? parseFloat(form.budget) : null,
                location: form.location || null,
                category: form.category || null,
                status: 'active',
                client_id: user.id,
            }])
            if (insertError) throw insertError
            setSuccess(true)
            if (onPosted) onPosted()
            setTimeout(() => onClose(), 1500)
        } catch (err) {
            setError(err.message || 'Failed to post job.')
        } finally {
            setLoading(false)
        }
    }

    // Backdrop click closes modal
    const handleBackdrop = (e) => {
        if (e.target === e.currentTarget) onClose()
    }

    if (!isClient && user !== null) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleBackdrop}>
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
                    <p className="text-slate-700 font-semibold mb-4">Only clients can post jobs.</p>
                    <button onClick={onClose} className="px-6 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700">Close</button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={handleBackdrop}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900">Post a Job</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {success ? (
                        <div className="py-8 text-center">
                            <div className="text-4xl mb-3">✅</div>
                            <p className="text-green-700 font-semibold text-lg">Job posted successfully!</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Job Title <span className="text-red-500">*</span></label>
                                <input
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Plumber needed for bathroom repair"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Description <span className="text-red-500">*</span></label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    required
                                    rows={4}
                                    placeholder="Describe the job, requirements, timeline..."
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Budget (FCFA)</label>
                                    <input
                                        name="budget"
                                        type="number"
                                        min="0"
                                        value={form.budget}
                                        onChange={handleChange}
                                        placeholder="e.g. 50000"
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
                                    <select
                                        name="location"
                                        value={form.location}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Any location</option>
                                        {availableLocations.map(loc => (
                                            <option key={loc.value} value={loc.value}>{loc.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                                <select
                                    name="category"
                                    value={form.category}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Select a category</option>
                                    {handworks.map(hw => (
                                        <option key={hw.value} value={hw.value}>{hw.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md disabled:opacity-60"
                                >
                                    {loading ? 'Posting...' : 'Post Job'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    )
}
