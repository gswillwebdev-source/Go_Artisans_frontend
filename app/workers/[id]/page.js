'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import WorkerRatingsDisplay from '@/components/WorkerRatingsDisplay'

export default function WorkerProfilePage() {
    const params = useParams()
    const workerId = params.id
    const [worker, setWorker] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
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
                        completed_jobs,
                        rating,
                        created_at
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

        if (workerId) {
            fetchWorker()
        }
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
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link href="/browse-workers" className="text-indigo-600 hover:text-indigo-700 mb-6 inline-block">
                    ← Back to workers
                </Link>

                <div className="bg-white rounded-lg shadow-lg p-8">
                    {/* Profile Header */}
                    <div className="flex flex-col md:flex-row gap-8 mb-8">
                        {/* Profile Picture */}
                        <div>
                            {worker.profilePicture ? (
                                <div className="w-48 h-48 rounded-lg overflow-hidden bg-gray-200">
                                    <img
                                        src={worker.profilePicture}
                                        alt={`${worker.firstName} ${worker.lastName}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-48 h-48 rounded-lg bg-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-6xl">
                                    {worker.firstName?.charAt(0)}{worker.lastName?.charAt(0)}
                                </div>
                            )}
                        </div>

                        {/* Worker Info */}
                        <div className="flex-1">
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                {worker.firstName} {worker.lastName}
                            </h1>
                            <p className="text-2xl text-indigo-600 font-semibold mb-4">
                                {worker.jobTitle || 'No title specified'}
                            </p>

                            <div className="space-y-3 text-gray-600">
                                {worker.location && (
                                    <div className="flex items-center">
                                        <span className="text-xl mr-3">📍</span>
                                        <span>{worker.location}</span>
                                    </div>
                                )}
                                {worker.yearsExperience > 0 && (
                                    <div className="flex items-center">
                                        <span className="text-xl mr-3">⏱️</span>
                                        <span>{worker.yearsExperience} years of experience</span>
                                    </div>
                                )}
                                {worker.completedJobs > 0 && (
                                    <div className="flex items-center">
                                        <span className="text-xl mr-3">✅</span>
                                        <span>{worker.completedJobs} jobs completed</span>
                                    </div>
                                )}
                                {worker.rating > 0 && (
                                    <div className="flex items-center">
                                        <span className="text-xl mr-3">⭐</span>
                                        <span>{worker.rating.toFixed(1)} / 5.0 rating</span>
                                    </div>
                                )}
                                {worker.email && (
                                    <div className="flex items-center">
                                        <span className="text-xl mr-3">📧</span>
                                        <span>{worker.email}</span>
                                    </div>
                                )}
                            </div>

                            {/* Contact Button */}
                            {worker.phoneNumber ? (
                                <a
                                    href={`https://wa.me/${worker.phoneNumber.replace(/\D/g, '')}?text=Hello%20${worker.firstName},%20I%20am%20interested%20in%20your%20services.`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-6 bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 font-medium transition inline-flex items-center gap-2"
                                >
                                    <span>💬</span>
                                    Contact on WhatsApp
                                </a>
                            ) : (
                                <button disabled className="mt-6 bg-gray-300 text-white px-8 py-3 rounded-lg cursor-not-allowed font-medium">
                                    No Contact Info Available
                                </button>
                            )}
                        </div>
                    </div>

                    <hr className="my-8" />

                    {/* Bio Section */}
                    {worker.bio && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                            <p className="text-gray-600 whitespace-pre-wrap">{worker.bio}</p>
                        </div>
                    )}

                    {/* Skills/Services Section */}
                    {worker.services && worker.services.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Skills & Services</h2>
                            <div className="flex flex-wrap gap-2">
                                {worker.services.map((service, index) => (
                                    <span
                                        key={index}
                                        className="inline-block bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full"
                                    >
                                        {service}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Portfolio Section */}
                    {worker.portfolio && worker.portfolio.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Portfolio</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {worker.portfolio.map((item, index) => {
                                    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)/i.test(item) || item.includes('data:image')

                                    return isImage ? (
                                        <a
                                            key={index}
                                            href={item}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="overflow-hidden rounded-lg hover:shadow-lg transition-shadow"
                                        >
                                            <img
                                                src={item}
                                                alt={`Portfolio item ${index + 1}`}
                                                className="w-full h-48 object-cover hover:scale-105 transition-transform"
                                            />
                                        </a>
                                    ) : (
                                        <a
                                            key={index}
                                            href={item}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition text-indigo-600 text-sm flex items-center justify-center h-48 break-all"
                                        >
                                            📎 {item.substring(item.lastIndexOf('/') + 1) || `Portfolio Item ${index + 1}`}
                                        </a>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Reviews Section */}
                    {worker.reviews && worker.reviews.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Reviews ({worker.reviews.length})
                            </h2>
                            <div className="space-y-4">
                                {worker.reviews.map((review) => (
                                    <div key={review.id} className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-gray-900">
                                                {review.client_first_name} {review.client_last_name}
                                            </span>
                                            <span className="text-yellow-500">{'⭐'.repeat(review.rating)}</span>
                                        </div>
                                        <p className="text-gray-600 text-sm">{review.comment}</p>
                                        <p className="text-gray-500 text-xs mt-2">
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ratings Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Client Ratings & Feedback</h2>
                        <WorkerRatingsDisplay workerId={worker.id} />
                    </div>
                </div>
            </div>
        </div>
    )
}
