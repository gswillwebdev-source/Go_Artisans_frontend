'use client'

import { useLanguage } from '@/context/LanguageContext'

export default function FollowStats({ followerCount = 0, followingCount = 0, isOwnProfile = false }) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-wrap gap-3 sm:gap-5 py-5 border-b border-slate-200">
      <div className="min-w-[96px] sm:min-w-[110px] flex flex-col items-center rounded-xl bg-blue-50/80 px-3 sm:px-4 py-3 border border-blue-100">
        <p className="display-font text-2xl font-bold text-blue-700">{followerCount}</p>
        <p className="text-sm text-slate-600 font-medium">
          {followerCount === 1 ? t('followersLabelSingular') : t('followersLabelPlural')}
        </p>
      </div>

      <div className="min-w-[96px] sm:min-w-[110px] flex flex-col items-center rounded-xl bg-emerald-50/80 px-3 sm:px-4 py-3 border border-emerald-100">
        <p className="display-font text-2xl font-bold text-emerald-700">{followingCount}</p>
        <p className="text-sm text-slate-600 font-medium">
          {t('following')}
        </p>
      </div>

      {isOwnProfile && (
        <div className="flex items-center text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
          <span>👤 {followerCount} {t('followersLabelPlural')}</span>
        </div>
      )}
    </div>
  )
}
