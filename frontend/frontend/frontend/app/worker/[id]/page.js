'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import WorkerRatingsDisplay from '@/components/WorkerRatingsDisplay'
import VerifiedBadge from '@/components/VerifiedBadge'

export default function WorkerProfilePage() {
    const params = useParams()
    const workerId = params?.id
    const [worker, setWorker] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!workerId) return

        async function fetchWorker() {
            try {
                setLoading(true)

                const { data: workerData, error } = await supabase
                    .from('users')
                    .select(`
                        id,
                        first_name,
                        last_name,
                        email,
                        phone_number,
                        user_type,
                        job_title,
                        location,
                        bio,
                        years_experience,
                        services,
                        portfolio,
                        profile_picture,
                        completed_jobs,
                        rating,
                        is_active,
                        created_at,
                        verification_badges!verification_badges_user_id_fkey(status, badge_type)
                    `)
                    .eq('id', workerId)
                    .eq('user_type', 'worker')
                    .single()

                if (error) {
                    throw error
                }

                setWorker(workerData)
            } catch (err) {
                console.error('Failed to fetch worker:', err)
                setError('Failed to load worker profile')
            } finally {
                setLoading(false)
            }
        }

        fetchWorker()
    }, [workerId])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">Loading...</div>
            </div>
        )
    }

    if (error || !worker) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        {error || 'Worker not found'}
                    </h2>
                    <Link href="/browse-workers" className="text-indigo-600 hover:text-indigo-700">
                        Back to workers
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link href="/browse-workers" className="text-indigo-600 hover:text-indigo-700 mb-6 inline-block">
                    ← Back to workers
                </Link>

                <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
                    {/* Profile Header */}
                    <div className="flex flex-col md:flex-row gap-6 sm:gap-8 mb-8">
                        {/* Profile Picture */}
                        <div className="self-center md:self-start">
                            {worker.profile_picture ? (
                                <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-lg overflow-hidden bg-gray-200">
                                    <img
                                        src={worker.profile_picture}
                                        alt={`${worker.first_name} ${worker.last_name}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-lg bg-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-4xl sm:text-5xl md:text-6xl">
                                    {worker.first_name?.charAt(0)}{worker.last_name?.charAt(0)}
                                </div>
                            )}
                        </div>

                        {/* Worker Info */}
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold break-words flex items-center gap-2">
                                    {worker.first_name} {worker.last_name}
                                    {Array.isArray(worker.verification_badges) && worker.verification_badges.some(b => b.status === 'approved') && (
                                        <VerifiedBadge size={28} />
                                    )}
                                </h1>
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${worker.is_active
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {worker.is_active ? '✓ Available' : '✗ Busy'}
                                </span>
                            </div>

                            {worker.job_title && (
                                <p className="text-lg sm:text-xl text-indigo-600 font-semibold mb-1 break-words">
                                    {worker.job_title}
                                </p>
                            )}

                            {worker.location && (
                                <p className="text-gray-600 mb-4">
                                    📍 {worker.location}
                                </p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-base sm:text-lg">
                                <div>
                                    <span className="font-semibold text-gray-900">
                                        ⭐ {(worker.rating || 0).toFixed(1)}/5
                                    </span>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-900">
                                        ✓ {worker.completed_jobs || 0} jobs completed
                                    </span>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-900">
                                        📅 {worker.years_experience || 0} years experience
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bio */}
                    {worker.bio && (
                        <div className="border-t pt-6 mb-6">
                            <h2 className="text-2xl font-bold mb-3">About</h2>
                            <p className="text-gray-700 text-lg">{worker.bio}</p>
                        </div>
                    )}

                    {/* Services */}
                    {worker.services && worker.services.length > 0 && (
                        <div className="border-t pt-6 mb-6">
                            <h2 className="text-2xl font-bold mb-3">Services</h2>
                            <div className="flex flex-wrap gap-2">
                                {worker.services.map((service, idx) => (
                                    <span
                                        key={idx}
                                        className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full font-medium"
                                    >
                                        {service}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Portfolio */}
                    {worker.portfolio && worker.portfolio.length > 0 && (
                        <div className="border-t pt-6 mb-6">
                            <h2 className="text-2xl font-bold mb-3">Portfolio</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {worker.portfolio.map((item, idx) => (
                                    <a
                                        key={idx}
                                        href={item}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:underline truncate"
                                    >
                                        Portfolio Item {idx + 1}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ratings */}
                    <div className="border-t pt-6">
                        <h2 className="text-2xl font-bold mb-4">Reviews</h2>
                        <WorkerRatingsDisplay workerId={worker.id} />
                    </div>
                </div>
            </div>
        </div>
    )
}
