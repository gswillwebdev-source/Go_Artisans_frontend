'use client'

import { useEffect, useRef, useState } from 'react'
import { handworks, togoLocations } from '@/lib/togoData'
import { useLanguage } from '@/context/LanguageContext'

export default function SearchBar({ onSearch, isSearching = false }) {
    const { t } = useLanguage()
    const [keyword, setKeyword] = useState('')
    const [location, setLocation] = useState('')
    const [jobType, setJobType] = useState('')
    const didMountRef = useRef(false)

    const triggerSearch = () => {
        onSearch({ keyword, location, jobType })
    }

    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true
            return
        }

        const timer = setTimeout(() => {
            triggerSearch()
        }, 350)

        return () => clearTimeout(timer)
    }, [keyword, location, jobType])

    const handleSubmit = (e) => {
        e.preventDefault()
        triggerSearch()
    }

    const handleReset = () => {
        setKeyword('')
        setLocation('')
        setJobType('')
        onSearch({ keyword: '', location: '', jobType: '' })
    }

    return (
        <form onSubmit={handleSubmit} className="glass-surface p-6 rounded-2xl border border-white/80 shadow-lg fade-in-up">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <p className="text-sm text-slate-600">Type to search, results update automatically.</p>
                <div className="flex items-center gap-3">
                    {isSearching && <span className="text-sm font-semibold text-blue-700">Searching...</span>}
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-sm font-semibold text-slate-600 hover:text-blue-700"
                    >
                        Reset
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('search')}</label>
                    <input
                        type="text"
                        list="handwork-suggestions"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Painter, mason, tile work, plumbing..."
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white/90 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <datalist id="handwork-suggestions">
                        {handworks.map((hw) => (
                            <option key={hw.value} value={hw.value}>{hw.label}</option>
                        ))}
                    </datalist>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('location')}</label>
                    <select
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white/90 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">{t('allLocations')}</option>
                        {togoLocations.map(loc => (
                            <option key={loc.value} value={loc.value}>{loc.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('jobType')}</label>
                            <select
                                value={jobType}
                                onChange={(e) => setJobType(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white/90 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">{t('allTypes')}</option>
                                <option value="one-time">{t('oneTime')}</option>
                                <option value="ongoing">{t('ongoing')}</option>
                                <option value="part-time">{t('partTime')}</option>
                                <option value="full-time">{t('fullTime')}</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="w-full primary-action text-white py-2.5 rounded-xl font-semibold shadow-md shadow-blue-500/20 interactive-rise"
                        >
                            {t('search')}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    )
}
