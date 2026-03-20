'use client'

import { useState } from 'react'
import { handworks, togoLocations } from '@/lib/togoData'

export default function SearchBar({ onSearch }) {
    const [keyword, setKeyword] = useState('')
    const [location, setLocation] = useState('')
    const [jobType, setJobType] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        onSearch({ keyword, location, jobType })
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Handwork / Trade</label>
                    <select
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                    >
                        <option value="">All Handworks</option>
                        {handworks.map(hw => (
                            <option key={hw.value} value={hw.value}>{hw.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <select
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                    >
                        <option value="">All Locations</option>
                        {togoLocations.map(loc => (
                            <option key={loc.value} value={loc.value}>{loc.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
                    <select
                        value={jobType}
                        onChange={(e) => setJobType(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                    >
                        <option value="">All Types</option>
                        <option value="one-time">One-time</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="part-time">Part-time</option>
                        <option value="full-time">Full-time</option>
                    </select>
                </div>

                <div className="flex items-end">
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium"
                    >
                        Search
                    </button>
                </div>
            </div>
        </form>
    )
}
