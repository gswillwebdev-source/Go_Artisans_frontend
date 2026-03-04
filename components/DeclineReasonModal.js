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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {t('declineCompletion')}
                </h2>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-amber-900">
                        <strong>Tell the worker why:</strong> Providing constructive feedback helps them improve
                        and understand what went wrong. This helps maintain quality standards on GoArtisans.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Quick reason buttons */}
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-3">Quick reasons:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {commonReasons.map((commonReason) => (
                                <button
                                    key={commonReason}
                                    type="button"
                                    onClick={() => setReason(commonReason)}
                                    className={`p-2 text-sm rounded border transition ${reason === commonReason
                                        ? 'bg-red-600 text-white border-red-600'
                                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                                        }`}
                                >
                                    {commonReason}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('reason')}
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why the job completion doesn't meet requirements..."
                            maxLength={500}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
                            rows={4}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            {reason.length}/500 characters
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 justify-end mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !reason.trim()}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                        >
                            {loading ? t('providingReason') : t('declineAndSendReason')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
