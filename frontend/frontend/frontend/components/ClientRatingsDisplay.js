'use client'

import { useEffect, useState } from 'react'
import completionClient from '@/lib/completionClient'

export default function ClientRatingsDisplay({ workerId, isCurrentUser = false }) {
    const [ratings, setRatings] = useState([])
    const [averageRating, setAverageRating] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadRatings() {
            try {
                if (!workerId || !isCurrentUser) {
                    // Only load client ratings if it's the current user's profile
                    setRatings([])
                    setAverageRating(0)
                    setLoading(false)
                    return
                }

                setLoading(true)
                setError('')
                const ratingsData = await completionClient.getClientRatings(workerId)

                if (Array.isArray(ratingsData) && ratingsData.length > 0) {
                    setRatings(ratingsData)
                    const avgRating = (
                        ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
                    ).toFixed(2)
                    setAverageRating(parseFloat(avgRating))
                } else {
                    setRatings([])
                    setAverageRating(0)
                }
            } catch (err) {
                console.error('Failed to load client ratings:', err)
                setRatings([])
                setAverageRating(0)
                setError(err?.message || 'Failed to load ratings')
            } finally {
                setLoading(false)
            }
        }

        loadRatings()
    }, [workerId, isCurrentUser])

    if (!isCurrentUser) {
        // Only show to the worker themselves
        return null
    }

    if (loading) {
        return (
            <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Loading client ratings...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
            </div>
        )
    }

    if (ratings.length === 0) {
        return (
            <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-gray-600 text-sm">No client ratings yet. Complete more jobs to receive feedback!</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Average Rating Card */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
                <div className="text-center">
                    <p className="text-sm text-blue-700 font-semibold mb-2">💼 Client Feedback (Private)</p>
                    <div className="mb-2">
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                            {averageRating.toFixed(1)}
                            <span className="text-2xl text-blue-500">/5.0</span>
                        </div>
                        <div className="flex justify-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <svg
                                    key={i}
                                    className={`w-5 h-5 ${i < Math.round(averageRating)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                        }`}
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>
                    </div>
                    <p className="text-sm text-blue-900 mt-3 font-medium">
                        Based on {ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'} from clients
                    </p>
                </div>
            </div>

            {/* Individual Ratings */}
            <div>
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Feedback from Clients</h4>
                <div className="space-y-3">
                    {ratings.map((rating) => (
                        <div key={rating.id} className="border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition bg-blue-50">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    {rating.profile_picture ? (
                                        <img
                                            src={rating.profile_picture}
                                            alt={rating.first_name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-sm font-medium text-blue-700">
                                            {rating.first_name[0]}{rating.last_name[0]}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {rating.first_name} {rating.last_name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(rating.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <svg
                                            key={i}
                                            className={`w-4 h-4 ${i < rating.rating
                                                ? 'text-yellow-400 fill-yellow-400'
                                                : 'text-gray-300'
                                                }`}
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>
                            </div>
                            {rating.review && (
                                <p className="text-sm text-gray-700 mt-2">{rating.review}</p>
                            )}
                            {rating.job_title && (
                                <p className="text-xs text-gray-600 mt-2">Job: <span className="font-medium">{rating.job_title}</span></p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
