'use client'

import { useState } from 'react'
import completionClient from '@/lib/completionClient'
import { useLanguage } from '@/context/LanguageContext'

export default function DeclineReasonModal({
    completionId,
    isOpen,
    onClose,
    onSuccess
}) {
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { t } = useLanguage()

    const commonReasons = [
        'Work quality not acceptable',
        'Incomplete deliverables',
        'Does not meet requirements',
        'Timeline issues',
        'Communication problems',
        'Other'
    ]

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!reason.trim()) {
            setError(t('provideDeclineReason'))
            return
        }

        setLoading(true)
        setError('')

        try {
            await completionClient.declineCompletion(completionId, reason)
            setReason('')
            if (onSuccess) onSuccess()
            onClose()
        } catch (err) {
            setError(err.message || t('failedDecline'))
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl p-4 sm:p-8 max-w-md w-full my-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    {t('declineCompletion')}
                </h2>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                    <p className="text-xs sm:text-sm text-amber-900">
                        <strong>Tell the worker why:</strong> Providing constructive feedback helps them improve
                        and understand what went wrong. This helps maintain quality standards on GoArtisans.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded mb-4 text-xs sm:text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    {/* Quick reason buttons */}
                    <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Quick reasons:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {commonReasons.map((commonReason) => (
                                <button
                                    key={commonReason}
                                    type="button"
                                    onClick={() => setReason(commonReason)}
                                    className={`p-2 text-xs sm:text-sm rounded border transition ${reason === commonReason
                                        ? 'bg-red-600 text-white border-red-600'
                                        : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                                        }`}
                                >
                                    {commonReason}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom reason */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                            {t('reason')}
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why the job completion doesn't meet requirements..."
                            maxLength={500}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none text-xs sm:text-sm"
                            rows={3}
                        />
                        <p className="text-xs text-gray-500 mt-1 sm:mt-2">
                            {reason.length}/500 characters
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 sm:gap-4 justify-end pt-2 sm:pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-3 sm:px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition text-xs sm:text-sm font-medium"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !reason.trim()}
                            className="px-3 sm:px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                        >
                            {loading ? (
                                <>
                                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span className="hidden sm:inline">{t('providingReason')}</span>
                                </>
                            ) : (
                                <>
                                    ✕ <span className="hidden sm:inline">{t('declineAndSendReason')}</span> <span className="sm:hidden">Decline</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
