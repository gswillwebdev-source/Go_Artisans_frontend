'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function WorkerCard({ worker }) {
    const bioPreview = worker.bio ? worker.bio.substring(0, 120) : 'No bio available'

    return (
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
            {/* Profile Picture */}
            <div className="mb-4 flex justify-center">
                {worker.profile_picture ? (
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200">
                        <img
                            src={worker.profile_picture}
                            alt={`${worker.first_name} ${worker.last_name}`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-32 h-32 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-4xl">
                        {worker.first_name?.charAt(0)}{worker.last_name?.charAt(0)}
                    </div>
                )}
            </div>

            {/* Worker Info */}
            <h3 className="text-xl font-bold text-gray-900 mb-1 text-center">
                {worker.first_name} {worker.last_name}
            </h3>

            <p className="text-indigo-600 font-semibold text-center mb-3">
                {worker.job_title || 'No title specified'}
            </p>

            <div className="space-y-2 mb-4 text-center">
                <div className="flex items-center justify-center text-gray-600 text-sm">
                    <span className="font-medium">📍</span>
                    <span className="ml-2">{worker.location || 'Location not specified'}</span>
                </div>
                {worker.years_experience > 0 && (
                    <div className="flex items-center justify-center text-gray-600 text-sm">
                        <span className="font-medium">⏱️</span>
                        <span className="ml-2">{worker.years_experience} years experience</span>
                    </div>
                )}
                {worker.rating > 0 && (
                    <div className="flex items-center justify-center text-gray-600 text-sm">
                        <span className="font-medium">⭐</span>
                        <span className="ml-2">{worker.rating.toFixed(1)} / 5.0</span>
                    </div>
                )}
            </div>

            {/* Bio Preview */}
            <p className="text-gray-600 text-sm mb-4 text-center line-clamp-2">
                {bioPreview}
                {worker.bio && worker.bio.length > 120 ? '...' : ''}
            </p>

            {/* Services */}
            {worker.services && worker.services.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Skills:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {worker.services.slice(0, 3).map((service, index) => (
                            <span
                                key={index}
                                className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded"
                            >
                                {service}
                            </span>
                        ))}
                        {worker.services.length > 3 && (
                            <span className="text-xs text-gray-500">+{worker.services.length - 3} more</span>
                        )}
                    </div>
                </div>
            )}

            {/* View Profile Button */}
            <Link
                href={`/workers/${worker.id}`}
                className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 text-center font-medium transition"
            >
                View Profile
            </Link>
        </div>
    )
}
