'use client'

import { useState, useCallback } from 'react'
import { useLanguage } from '@/context/LanguageContext'

export default function CompletionRequest({
    job,
    completion,
    onConfirm,
    onDecline,
    isProcessing
}) {
    const { t } = useLanguage()
    const [error, setError] = useState('')

    const handleConfirmClick = useCallback(async () => {
        setError('')
        try {
            await onConfirm(completion.id)
        } catch (err) {
            setError(err.message || 'Failed to confirm')
        }
    }, [completion.id, onConfirm])

    const handleDeclineClick = useCallback(async () => {
        setError('')
        try {
            await onDecline(completion.id)
        } catch (err) {
            setError(err.message || 'Failed to decline')
        }
    }, [completion.id, onDecline])

    const isPending = completion.status === 'pending'
    const isConfirmed = completion.status === 'confirmed'
    const isDeclined = completion.status === 'declined'

    return (
        <>
            <div className={`border-2 rounded-lg p-3 sm:p-6 transition-all overflow-hidden ${
                isPending
                    ? 'border-yellow-300 bg-yellow-50'
                    : isConfirmed
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
            }`}>
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            {job.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            {isPending && `⏳ ${t('workerCompletedAwaiting')}`}
                            {isConfirmed && `✓ ${t('confirmed')}`}
                            {isDeclined && `✕ ${t('declined')}`}
                        </p>
                    </div>
                    <span className={`flex-shrink-0 px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        isPending
                            ? 'bg-yellow-200 text-yellow-900 animate-pulse'
                            : isConfirmed
                            ? 'bg-green-200 text-green-900'
                            : 'bg-red-200 text-red-900'
                    }`}>
                        {isPending && t('needsReview')}
                        {isConfirmed && t('confirmed')}
                        {isDeclined && t('declined')}
                    </span>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-100 border border-red-300 text-red-800 px-3 py-2 rounded mb-4 text-xs sm:text-sm">
                        {error}
                    </div>
                )}

                {/* Action Section - Only show for pending */}
                {isPending && (
                    <div className="bg-white p-3 sm:p-4 rounded border border-yellow-200 mt-4">
                        <p className="text-xs sm:text-sm text-gray-700 mb-4">
                            <strong>{t('whyRateEachOther')}</strong> {t('ratingHelpWorkers')}
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
                            <button
                                onClick={handleConfirmClick}
                                disabled={isProcessing}
                                type="button"
                                title="Confirm completion"
                                className={`w-full py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                    isProcessing
                                        ? 'bg-gray-400 text-white cursor-not-allowed opacity-70'
                                        : 'bg-green-600 text-white hover:bg-green-700 active:scale-95 shadow hover:shadow-md'
                                }`}
                                aria-busy={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span className="hidden sm:inline">{t('confirming')}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>✓</span>
                                        <span className="hidden xs:inline">{t('confirmCompleted')}</span>
                                        <span className="xs:hidden">Confirm</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleDeclineClick}
                                disabled={isProcessing}
                                type="button"
                                title="Decline completion"
                                className={`w-full py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                    isProcessing
                                        ? 'bg-gray-400 text-white cursor-not-allowed opacity-70'
                                        : 'bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow hover:shadow-md'
                                }`}
                                aria-busy={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span className="hidden sm:inline">{t('processing')}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>✕</span>
                                        <span className="hidden xs:inline">{t('decline')}</span>
                                        <span className="xs:hidden">Decline</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Confirmed Section */}
                {isConfirmed && (
                    <div className="bg-white p-3 sm:p-4 rounded border border-green-200">
                        <p className="text-xs sm:text-sm text-green-900">
                            ✓ {t('jobCompletionConfirmed')}
                        </p>
                    </div>
                )}

                {/* Declined Section */}
                {isDeclined && (
                    <div className="bg-white p-3 sm:p-4 rounded border border-red-200">
                        <p className="text-xs sm:text-sm text-red-900 font-medium mb-2">
                            ✕ {t('jobCompletionDeclined')}
                        </p>
                        {completion.decline_reason && (
                            <p className="text-xs sm:text-sm text-red-800 italic">
                                {t('reason')}: {completion.decline_reason}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
