'use client'

import { useState } from 'react'
import { handworks, togoLocations } from '@/lib/togoData'
import { useLanguage } from '@/context/LanguageContext'

export default function SearchBar({ onSearch }) {
    const { t } = useLanguage()
    const [keyword, setKeyword] = useState('')
    const [location, setLocation] = useState('')
    const [jobType, setJobType] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        onSearch({ keyword, location, jobType })
    }

    return (
        <form onSubmit={handleSubmit} className="glass-surface p-6 rounded-2xl border border-white/80 shadow-lg fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('handworkTrade')}</label>
                    <select
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white/90 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">{t('allHandworks')}</option>
                        {handworks.map(hw => (
                            <option key={hw.value} value={hw.value}>{hw.label}</option>
                        ))}
                    </select>
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

                <div className="flex items-end">
                    <button
                        type="submit"
                        className="w-full primary-action text-white py-2.5 rounded-xl font-semibold shadow-md shadow-blue-500/20 interactive-rise"
                    >
                        {t('search')}
                    </button>
                </div>
            </div>
        </form>
    )
}
