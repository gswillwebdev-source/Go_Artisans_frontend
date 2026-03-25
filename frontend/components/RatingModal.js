'use client'

import { useState } from 'react'
import completionClient from '@/lib/completionClient'
import { useLanguage } from '@/context/LanguageContext'

export default function RatingModal({
    completionId,
    isOpen,
    onClose,
    onSuccess
}) {
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [review, setReview] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { t } = useLanguage()

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (rating === 0) {
            setError(t('selectRating'))
            return
        }

        setLoading(true)
        setError('')

        try {
            await completionClient.submitRating(completionId, rating, review)
            setRating(0)
            setReview('')
            if (onSuccess) onSuccess()
            onClose()
        } catch (err) {
            setError(err.message || t('failedSubmitRating'))
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const ratingExplanations = {
        1: t('ratingPoor'),
        2: t('ratingFair'),
        3: t('ratingGood'),
        4: t('ratingExcellent'),
        5: t('ratingOutstanding')
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl p-4 sm:p-8 max-w-2xl w-full my-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    {t('rateWorker')}
                </h2>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                    <p className="text-xs sm:text-sm text-blue-900">
                        <strong>{t('whyRate')}</strong> {t('ratingHelpWorkersDetailed')}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded mb-4 text-xs sm:text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    {/* Rating Stars */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3 sm:mb-4">
                            {t('rating')}
                        </label>
                        <div className="flex gap-2 sm:gap-3 mb-3 sm:mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="transition-transform hover:scale-110 p-1"
                                >
                                    <svg
                                        className={`w-8 h-8 sm:w-10 sm:h-10 cursor-pointer ${star <= (hoverRating || rating)
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-300'
                                            }`}
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                </button>
                            ))}
                        </div>

                        {(hoverRating || rating) > 0 && (
                            <p className="text-xs sm:text-sm text-gray-600 italic">
                                {ratingExplanations[hoverRating || rating]}
                            </p>
                        )}
                    </div>

                    {/* Review Text */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                            {t('review')} ({t('optional')})
                        </label>
                        <textarea
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder={t('shareExperiencePlaceholder')}
                            maxLength={500}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none text-xs sm:text-sm"
                            rows={3}
                        />
                        <p className="text-xs text-gray-500 mt-1 sm:mt-2">
                            {t('charactersCount').replace('{{count}}', review.length)}
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
                            {t('maybeLater')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || rating === 0}
                            className="px-3 sm:px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-xs sm:text-sm font-medium flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span className="hidden sm:inline">{t('submitting')}</span>
                                </>
                            ) : (
                                <>
                                    ✓ <span className="hidden sm:inline">{t('submitRating')}</span> <span className="sm:hidden">{t('submitRating')}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
