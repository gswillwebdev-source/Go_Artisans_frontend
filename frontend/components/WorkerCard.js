'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function WorkerCard({ worker }) {
    const bioPreview = worker.bio ? worker.bio.substring(0, 120) : 'No bio available'

    return (
        <div className="elevated-card interactive-rise rounded-2xl p-6">
            {/* Active Status Badge */}
            <div className="flex justify-end mb-2">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${worker.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                    {worker.is_active ? '✓ Available' : '✗ Busy'}
                </span>
            </div>

            {/* Profile Picture */}
            <div className="mb-4 flex justify-center">
                {worker.profile_picture ? (
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-200 ring-4 ring-blue-50">
                        <img
                            src={worker.profile_picture}
                            alt={`${worker.first_name} ${worker.last_name}`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-4xl ring-4 ring-blue-50">
                        {worker.first_name?.charAt(0)}{worker.last_name?.charAt(0)}
                    </div>
                )}
            </div>

            {/* Worker Info */}
            <h3 className="display-font text-xl font-bold text-slate-900 mb-1 text-center tracking-tight">
                {worker.first_name} {worker.last_name}
            </h3>

            <p className="text-blue-700 font-semibold text-center mb-3">
                {worker.job_title || 'No title specified'}
            </p>

            <div className="space-y-2 mb-4 text-center">
                <div className="flex items-center justify-center text-slate-600 text-sm">
                    <span className="font-medium">📍</span>
                    <span className="ml-2">{worker.location || 'Location not specified'}</span>
                </div>
                {worker.years_experience > 0 && (
                    <div className="flex items-center justify-center text-slate-600 text-sm">
                        <span className="font-medium">⏱️</span>
                        <span className="ml-2">{worker.years_experience} years experience</span>
                    </div>
                )}
                {worker.rating > 0 && (
                    <div className="flex items-center justify-center text-slate-600 text-sm">
                        <span className="font-medium">⭐</span>
                        <span className="ml-2">{worker.rating.toFixed(1)} / 5.0</span>
                    </div>
                )}
            </div>

            {/* Bio Preview */}
            <p className="text-slate-600 text-sm mb-4 text-center line-clamp-2">
                {bioPreview}
                {worker.bio && worker.bio.length > 120 ? '...' : ''}
            </p>

            {/* Services */}
            {worker.services && worker.services.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Skills:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {worker.services.slice(0, 3).map((service, index) => (
                            <span
                                key={index}
                                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-lg"
                            >
                                {service}
                            </span>
                        ))}
                        {worker.services.length > 3 && (
                            <span className="text-xs text-slate-500">+{worker.services.length - 3} more</span>
                        )}
                    </div>
                </div>
            )}

            {/* View Profile Button */}
            <Link
                href={`/workers/${worker.id}`}
                className="w-full primary-action py-2.5 rounded-xl text-center font-semibold transition shadow-sm"
            >
                View Profile
            </Link>
        </div>
    )
}
