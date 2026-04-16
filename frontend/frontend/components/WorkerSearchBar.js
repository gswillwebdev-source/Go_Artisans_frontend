'use client'

import { useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'

export default function WorkerSearchBar({ onSearch }) {
    const { t } = useLanguage()
    const [jobTitle, setJobTitle] = useState('')
    const [location, setLocation] = useState('')
    const [jobType, setJobType] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        onSearch({ keyword: jobTitle, location, jobType })
    }

    return (
        <form onSubmit={handleSubmit} className="glass-surface p-6 rounded-2xl border border-white/80 shadow-lg fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('jobTitleOrSkill')}</label>
                    <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder={t('jobTitleOrSkillPlaceholder')}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white/90 focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('location')}</label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder={t('locationPlaceholder')}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white/90 focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('jobType')}</label>
                    <select
                        value={jobType}
                        onChange={(e) => setJobType(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white/90 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">{t('allTypes')}</option>
                        <option value="full_time">{t('fullTime')}</option>
                        <option value="part_time">{t('partTime')}</option>
                        <option value="contract">{t('contract')}</option>
                        <option value="remote">{t('remote')}</option>
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
