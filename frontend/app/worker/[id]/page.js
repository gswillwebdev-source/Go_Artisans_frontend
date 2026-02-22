'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import apiClient from '@/lib/apiClient'

export default function WorkerProfilePage() {
    const params = useParams()
    const id = params?.id
    const [worker, setWorker] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!id) return
        async function fetchWorker() {
            try {
                setLoading(true)
                const res = await apiClient.getWorkerProfile(id)
                setWorker(res.data.worker || res.data)
            } catch (err) {
                console.error('Failed to load worker profile', err)
                setError('Failed to load worker profile')
            } finally {
                setLoading(false)
            }
        }
        fetchWorker()
    }, [id])

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>
    if (error) return <div className="min-h-screen flex items-center justify-center">{error}</div>

    if (!worker) return <div className="min-h-screen flex items-center justify-center">Worker not found</div>

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-8">
                {/* Top Section */}
                <div className="flex items-center gap-6">
                    <img src="/default-avatar.png" alt="profile" className="w-28 h-28 rounded-full object-cover border" />
                    <div>
                        <h1 className="text-2xl font-bold">{worker.firstName} {worker.lastName}</h1>
                        <p className="text-sm text-gray-600">{worker.jobTitle || 'Service Provider'}</p>
                        <p className="text-sm text-gray-600">{worker.location || 'Location not specified'}</p>
                        <div className="mt-2 text-yellow-500">⭐ {worker.rating || 0}/5</div>
                    </div>
                </div>

                {/* About / Bio */}
                <div className="mt-6">
                    <h2 className="text-lg font-semibold">About</h2>
                    <p className="text-sm text-gray-700 mt-2">{worker.bio || 'No description provided.'}</p>
                    <div className="mt-3 text-sm text-gray-600">{worker.yearsExperience} years experience · {worker.completedJobs} jobs completed</div>
                </div>

                {/* Skills / Services */}
                <div className="mt-6">
                    <h2 className="text-lg font-semibold">Services</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {(worker.services || []).length === 0 ? (
                            <span className="text-sm text-gray-500">No services listed.</span>
                        ) : (
                            (worker.services || []).map((s, idx) => (
                                <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">{s}</span>
                            ))
                        )}
                    </div>
                </div>

                {/* Reviews */}
                <div className="mt-6">
                    <h2 className="text-lg font-semibold">Reviews ({(worker.reviews || []).length})</h2>
                    <div className="mt-3 space-y-4">
                        {(worker.reviews || []).length === 0 && <div className="text-sm text-gray-500">No reviews yet.</div>}
                        {(worker.reviews || []).map((r) => (
                            <div key={r.id} className="border p-3 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm font-medium">{r.client_first_name ? `${r.client_first_name} ${r.client_last_name || ''}` : 'Client'}</div>
                                    <div className="text-yellow-500">{'⭐'.repeat(Math.max(1, r.rating))} <span className="text-gray-600 text-sm">{r.rating}/5</span></div>
                                </div>
                                <div className="text-sm text-gray-700 mt-2">{r.comment}</div>
                                <div className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString()}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contact / Actions */}
                <div className="mt-6 flex gap-3">
                    <a href={`tel:${worker.phoneNumber || ''}`} className="flex-1 text-center bg-green-600 text-white px-4 py-2 rounded-lg">Call</a>
                    <button className="flex-1 text-center bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">Message</button>
                    <button className="flex-1 text-center bg-indigo-600 text-white px-4 py-2 rounded-lg">Request Service</button>
                </div>
            </div>
        </div>
    )
}
