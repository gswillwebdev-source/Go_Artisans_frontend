'use client'

import Link from 'next/link'

export default function JobCard({ job }) {
    return (
        <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{job.description?.substring(0, 100)}...</p>

            <div className="space-y-2 mb-4">
                <div className="flex items-center text-gray-600 text-sm">
                    <span className="font-medium">📍</span>
                    <span className="ml-2">{job.location}</span>
                </div>
                <div className="flex items-center text-gray-600 text-sm">
                    <span className="font-medium">💼</span>
                    <span className="ml-2">{job.job_type}</span>
                </div>
                {job.salary && (
                    <div className="flex items-center text-gray-600 text-sm">
                        <span className="font-medium">💰</span>
                        <span className="ml-2">${job.salary}</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <Link href={`/jobs/${job.id}`} className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 text-center font-medium">
                    View Details
                </Link>
                <button className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded hover:bg-indigo-50 font-medium">
                    Save
                </button>
            </div>
        </div>
    )
}
