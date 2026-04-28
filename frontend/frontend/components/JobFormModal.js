'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { togoLocations } from '@/lib/togoData'

export default function JobFormModal({ isOpen, onClose, userId, onPosted }) {
    const { t } = useLanguage()

    const MAX_JOB_MEDIA = 5
    const MAX_VIDEO_MB = 10

    const [jobFormData, setJobFormData] = useState({
        title: '',
        description: '',
        location: '',
        jobType: '',
        salary: '',
        media: []
    })
    const [jobFormError, setJobFormError] = useState(null)
    const [jobFormSuccess, setJobFormSuccess] = useState(false)
    const [jobFormLoading, setJobFormLoading] = useState(false)
    const [descriptionAutoFilled, setDescriptionAutoFilled] = useState(false)

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const MAX_BYTES = 2 * 1024 * 1024
            if (file.size <= MAX_BYTES) {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(file)
                return
            }
            const img = new Image()
            const url = URL.createObjectURL(file)
            img.onload = () => {
                URL.revokeObjectURL(url)
                const scale = Math.sqrt(MAX_BYTES / file.size)
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(img.width * scale)
                canvas.height = Math.round(img.height * scale)
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
                let quality = 0.85
                let dataUrl = canvas.toDataURL('image/jpeg', quality)
                while (dataUrl.length > MAX_BYTES * 1.37 && quality > 0.1) {
                    quality = Math.max(0.1, quality - 0.15)
                    dataUrl = canvas.toDataURL('image/jpeg', quality)
                }
                resolve(dataUrl)
            }
            img.onerror = () => {
                URL.revokeObjectURL(url)
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(file)
            }
            img.src = url
        })
    }

    const handleJobMediaChange = async (e) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return
        const remaining = MAX_JOB_MEDIA - (jobFormData.media?.length || 0)
        if (remaining <= 0) return
        const toProcess = files.slice(0, remaining)
        const results = []
        for (const file of toProcess) {
            const isVideo = file.type.startsWith('video/')
            const isImage = file.type.startsWith('image/')
            if (!isVideo && !isImage) continue
            if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
                alert(t('jobMediaVideoTooLarge').replace('{{mb}}', MAX_VIDEO_MB))
                continue
            }
            const data = await new Promise((resolve) => {
                if (isImage) {
                    compressImage(file).then(resolve)
                } else {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(reader.result)
                    reader.readAsDataURL(file)
                }
            })
            results.push({ type: isImage ? 'image' : 'video', data, name: file.name })
        }
        e.target.value = ''
        setJobFormData(prev => ({ ...prev, media: [...(prev.media || []), ...results] }))
    }

    const handleRemoveJobMedia = (index) => {
        setJobFormData(prev => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }))
    }

    const generateDescriptionFromTitle = (title) => {
        if (!title || title.length < 3) return ''
        const tl = title.toLowerCase()
        if (/plumb|plom/i.test(tl)) return t('autoDescPlumber')
        if (/electric|électric/i.test(tl)) return t('autoDescElectrician')
        if (/paint|peintr/i.test(tl)) return t('autoDescPainter')
        if (/clean|nettoy/i.test(tl)) return t('autoDescCleaner')
        if (/driv|chauffeur/i.test(tl)) return t('autoDescDriver')
        if (/carpe|menuis/i.test(tl)) return t('autoDescCarpenter')
        if (/mason|maçon|bricklay/i.test(tl)) return t('autoDescMason')
        if (/cook|chef|cuisinier/i.test(tl)) return t('autoDescCook')
        if (/guard|secur|gardien/i.test(tl)) return t('autoDescGuard')
        if (/garden|jardin/i.test(tl)) return t('autoDescGardener')
        if (/teach|tutor|prof/i.test(tl)) return t('autoDescTeacher')
        if (/web|app|software|logiciel/i.test(tl)) return t('autoDescDeveloper')
        if (/design|graphic|graphiste/i.test(tl)) return t('autoDescDesigner')
        if (/photo|video|film/i.test(tl)) return t('autoDescPhotographer')
        if (/move|transport|déménag/i.test(tl)) return t('autoDescMover')
        if (/repair|fix|réparat/i.test(tl)) return t('autoDescRepair')
        return t('autoDescGeneric').replace('{{title}}', title)
    }

    const handleJobInputChange = (e) => {
        const { name, value } = e.target
        if (name === 'title') {
            const autoDesc = generateDescriptionFromTitle(value)
            const shouldAutoFill = jobFormData.description === '' || descriptionAutoFilled
            setJobFormData(prev => ({
                ...prev,
                title: value,
                description: shouldAutoFill ? autoDesc : prev.description
            }))
            setDescriptionAutoFilled(shouldAutoFill && autoDesc.length > 0)
        } else if (name === 'description') {
            setDescriptionAutoFilled(false)
            setJobFormData(prev => ({ ...prev, description: value }))
        } else {
            setJobFormData(prev => ({ ...prev, [name]: value }))
        }
    }

    const handleClose = () => {
        setJobFormData({ title: '', description: '', location: '', jobType: '', salary: '', media: [] })
        setJobFormError(null)
        setJobFormSuccess(false)
        setDescriptionAutoFilled(false)
        onClose()
    }

    const handleJobSubmit = async (e) => {
        e.preventDefault()
        setJobFormError(null)
        setJobFormSuccess(false)

        if (!jobFormData.title?.trim()) {
            setJobFormError(t('projectTitleRequired'))
            return
        }
        if (!jobFormData.description?.trim()) {
            setJobFormError(t('projectDescriptionRequired'))
            return
        }
        if (!jobFormData.location?.trim()) {
            setJobFormError(t('projectLocationRequired'))
            return
        }
        if (!jobFormData.jobType?.trim()) {
            setJobFormError(t('projectTypeRequired'))
            return
        }
        if (!jobFormData.salary || jobFormData.salary === '') {
            setJobFormError(t('projectBudgetRequired'))
            return
        }

        setJobFormLoading(true)

        try {
            const createJobPayload = {
                title: jobFormData.title.trim(),
                description: jobFormData.description.trim(),
                budget: parseFloat(jobFormData.salary),
                location: jobFormData.location.trim(),
                category: jobFormData.jobType.trim(),
                media: jobFormData.media || [],
                client_id: userId,
                status: 'open'
            }

            const JOB_SAVE_TIMEOUT = 3000
            let timeoutId

            const savePromise = supabase
                .from('jobs')
                .insert([createJobPayload])
                .select()
                .single()

            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), JOB_SAVE_TIMEOUT)
            })

            const { data, error } = await Promise.race([savePromise, timeoutPromise])
            clearTimeout(timeoutId)

            if (error) throw error

            setJobFormData({ title: '', description: '', location: '', jobType: '', salary: '', media: [] })
            setDescriptionAutoFilled(false)
            setJobFormSuccess(true)
            setTimeout(() => {
                setJobFormSuccess(false)
                onClose()
                if (onPosted) onPosted(data)
            }, 1500)
        } catch (err) {
            console.error('Failed to post job', err)
            let errorMessage = t('failedSaveProject')
            if (err.message === 'TIMEOUT') errorMessage = t('projectSaveTimeout')
            else if (err.message?.includes('unique')) errorMessage = t('projectDuplicateTitle')
            else if (err.message?.includes('permission')) errorMessage = t('projectNoPermission')
            else if (err.message?.includes('connection') || err.message?.includes('ECONNREFUSED')) errorMessage = t('projectConnectionFailed')
            else if (err.message?.includes('budget') || err.message?.includes('salary')) errorMessage = t('projectBudgetInvalid')
            else errorMessage = err.message || t('failedSaveProject')
            setJobFormError(errorMessage)
        } finally {
            setJobFormLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="glass-surface rounded-3xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/80">
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200">
                    <div className="p-6 flex justify-between items-center">
                        <div>
                            <h2 className="profile-title text-2xl font-semibold">{t('postNewProject')}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">{t('postJobModalSubtitle')}</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 flex items-center gap-3">
                        <span className="text-xl flex-shrink-0">👷‍♂️</span>
                        <p className="text-sm text-white font-medium">{t('postJobModalBanner')}</p>
                    </div>
                </div>

                <form onSubmit={handleJobSubmit} className="p-6 space-y-6">
                    {jobFormError && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3 flex-1">
                                    <h3 className="text-sm font-medium text-red-800">{t('failedPostProject')}</h3>
                                    <p className="text-sm text-red-700 mt-2">{jobFormError}</p>
                                </div>
                                <button onClick={() => setJobFormError(null)} type="button" className="ml-3 text-red-600 hover:text-red-800 text-sm font-medium">✕</button>
                            </div>
                        </div>
                    )}

                    {jobFormSuccess && (
                        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3 flex-1">
                                    <h3 className="text-sm font-medium text-green-800">{t('projectPosted')}</h3>
                                    <p className="text-sm text-green-700 mt-2">{t('projectPostedSuccess')}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('projectTitleField')} *</label>
                        <input
                            type="text"
                            name="title"
                            value={jobFormData.title}
                            onChange={handleJobInputChange}
                            required
                            autoFocus
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                            placeholder={t('postJobTitlePlaceholder')}
                        />
                        <p className="text-xs text-indigo-500 mt-1.5">{t('postJobTitleHint')}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('projectDescriptionField')} *</label>
                        <textarea
                            name="description"
                            value={jobFormData.description}
                            onChange={handleJobInputChange}
                            required
                            rows="5"
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-colors ${descriptionAutoFilled ? 'border-indigo-300 bg-indigo-50/40' : 'border-gray-300'}`}
                            placeholder={t('aboutNeedPlaceholder')}
                        />
                        {descriptionAutoFilled && (
                            <p className="text-xs text-indigo-500 mt-1.5">{t('postJobDescAutoHint')}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                            <select
                                name="location"
                                value={jobFormData.location}
                                onChange={handleJobInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                            >
                                <option value="">{t('selectLocation')}</option>
                                {togoLocations.map(loc => (
                                    <option key={loc.value} value={loc.value}>{loc.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('projectTypeField')}</label>
                            <select
                                name="jobType"
                                value={jobFormData.jobType}
                                onChange={handleJobInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                            >
                                <option value="">{t('selectType')}</option>
                                <option value="one-time">{t('oneTime')}</option>
                                <option value="ongoing">{t('ongoing')}</option>
                                <option value="part-time">{t('partTime')}</option>
                                <option value="full-time">{t('fullTime')}</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('hiringRateBudget')}</label>
                        <input
                            type="text"
                            name="salary"
                            value={jobFormData.salary}
                            onChange={handleJobInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                            placeholder={t('budgetPlaceholder')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('jobMediaLabel')} <span className="text-gray-400 font-normal text-xs ml-1">({t('optional')})</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-3">{t('jobMediaHint').replace('{{max}}', MAX_JOB_MEDIA).replace('{{mb}}', MAX_VIDEO_MB)}</p>

                        {jobFormData.media?.length > 0 && (
                            <div className="flex flex-wrap gap-3 mb-3">
                                {jobFormData.media.map((item, i) => (
                                    <div key={i} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                                        {item.type === 'image' ? (
                                            <img src={item.data} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <video src={item.data} className="w-full h-full object-cover" muted playsInline />
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveJobMedia(i)}
                                                className="opacity-0 group-hover:opacity-100 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold transition-opacity"
                                                title={t('jobMediaRemove')}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        {item.type === 'video' && (
                                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">▶</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {(jobFormData.media?.length || 0) < MAX_JOB_MEDIA && (
                            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {t('jobMediaUploadBtn')}
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    onChange={handleJobMediaChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                        <button
                            type="submit"
                            disabled={jobFormLoading}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {jobFormLoading ? t('postingProject') : t('postProject')}
                        </button>
                        <button
                            type="button"
                            disabled={jobFormLoading}
                            onClick={handleClose}
                            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition font-medium flex-1 disabled:opacity-50"
                        >
                            {t('cancel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
