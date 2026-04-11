'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/context/LanguageContext'

export default function ChooseRolePage() {
    const router = useRouter()
    const { t } = useLanguage()
    const { user, isLoading: authLoading } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (authLoading) return

        if (!user) {
            // useAuth will redirect to login
            return
        }

        // If user already has a role, redirect
        if (user.user_type === 'worker') {
            router.push('/worker-profile')
            return
        } else if (user.user_type === 'client') {
            router.push('/client-profile')
            return
        }
    }, [user, authLoading, router])

    const routeToRoleHome = (role) => {
        if (role === 'worker') {
            router.replace('/worker-profile')
            return
        }

        if (role === 'client') {
            router.replace('/client-profile')
            return
        }
    }

    const chooseRole = async (selectedRole) => {
        setLoading(true)
        setError(null)

        try {
            const { data: currentProfile, error: currentProfileError } = await supabase
                .from('users')
                .select('id,user_type')
                .eq('id', user.id)
                .single()

            if (currentProfile?.user_type) {
                routeToRoleHome(currentProfile.user_type)
                return
            }

            if (currentProfileError && currentProfileError.code !== 'PGRST116') {
                throw currentProfileError
            }

            if (currentProfileError?.code === 'PGRST116') {
                const { error: insertError } = await supabase
                    .from('users')
                    .insert({
                        id: user.id,
                        email: user.email,
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        phone_number: user.phone_number || null,
                        user_type: selectedRole,
                        email_verified: Boolean(user.email_confirmed_at)
                    })

                if (insertError) throw insertError
            } else {
                const { data: updatedRole, error: updateError } = await supabase
                    .from('users')
                    .update({ user_type: selectedRole })
                    .eq('id', user.id)
                    .is('user_type', null)
                    .select('user_type')
                    .single()

                if (updateError) {
                    throw updateError
                }

                if (!updatedRole?.user_type) {
                    const { data: freshProfile } = await supabase
                        .from('users')
                        .select('user_type')
                        .eq('id', user.id)
                        .single()

                    if (freshProfile?.user_type) {
                        routeToRoleHome(freshProfile.user_type)
                        return
                    }
                }
            }

            // Keep auth metadata aligned so callback routes can resolve role even before profile read settles.
            await supabase.auth.updateUser({
                data: {
                    user_type: selectedRole
                }
            })

            routeToRoleHome(selectedRole)
        } catch (err) {
            console.error('Failed to set role:', err)
            setError(t('failedSetRole'))
            setLoading(false)
        }
    }

    const handleWorkerChoice = async () => {
        await chooseRole('worker')
    }

    const handleClientChoice = async () => {
        await chooseRole('client')
    }

    if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center text-slate-600 font-semibold">{t('loading')}</div>

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
            <div className="glass-surface rounded-3xl shadow-xl p-8 w-full max-w-2xl border border-white/90 fade-in-up">
                <h1 className="display-font text-4xl font-bold text-slate-900 mb-2 text-center tracking-tight">{t('roleWelcomeTitle')}</h1>
                <p className="text-slate-600 text-center mb-4">{t('roleWelcomeHi').replace('{{name}}', user.first_name || '')}</p>
                <p className="text-slate-600 text-center mb-8">{t('roleQuestion')}</p>

                {error && (
                    <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Worker Card */}
                    <button
                        onClick={handleWorkerChoice}
                        disabled={loading}
                        className="border-2 border-blue-500 rounded-2xl p-8 hover:bg-blue-50/80 transition transform hover:-translate-y-1 text-left disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg"
                    >
                        <div className="text-4xl mb-4">🔧</div>
                        <h2 className="display-font text-2xl font-bold text-slate-900 mb-2">{t('roleServiceProviderTitle')}</h2>
                        <p className="text-slate-600 mb-4">{t('roleServiceProviderDesc')}</p>
                        <div className="text-sm text-blue-700 font-semibold flex items-center gap-2">
                            {loading ? t('settingUp') : t('roleSetWorker')} <span>→</span>
                        </div>
                    </button>

                    {/* Client Card */}
                    <button
                        onClick={handleClientChoice}
                        disabled={loading}
                        className="border-2 border-emerald-500 rounded-2xl p-8 hover:bg-emerald-50/80 transition transform hover:-translate-y-1 text-left disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg"
                    >
                        <div className="text-4xl mb-4">👥</div>
                        <h2 className="display-font text-2xl font-bold text-slate-900 mb-2">{t('roleLookingHelpTitle')}</h2>
                        <p className="text-slate-600 mb-4">{t('roleLookingHelpDesc')}</p>
                        <div className="text-sm text-emerald-700 font-semibold flex items-center gap-2">
                            {loading ? t('settingUp') : t('roleSetClient')} <span>→</span>
                        </div>
                    </button>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-200 text-center">
                    <p className="text-slate-600 text-sm">
                        {t('roleLockedHint')}
                    </p>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/jobs')}
                        className="text-blue-700 hover:underline text-sm font-semibold"
                    >
                        {t('skipBrowseJobs')}
                    </button>
                </div>
            </div>
        </div>
    )
}
