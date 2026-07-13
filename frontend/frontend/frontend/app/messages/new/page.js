'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function NewChatPage() {
    const router = useRouter()
    const [session, setSession] = useState(null)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (!s) { router.replace('/login?redirect=/messages/new'); return }
            setSession(s)
        })
    }, [router])

    useEffect(() => {
        if (query.trim().length < 2) { setResults([]); return }
        const timer = setTimeout(async () => {
            setSearching(true)
            const { data } = await supabase
                .from('users')
                .select('id, first_name, last_name, profile_picture, user_type')
                .neq('id', session?.user?.id ?? '')
                .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
                .limit(12)
            setResults(data ?? [])
            setSearching(false)
        }, 300)
        return () => clearTimeout(timer)
    }, [query, session])

    return (
        <div className="min-h-screen bg-[var(--bg-0)]">
            <div className="max-w-lg mx-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <Link href="/messages" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="font-bold text-slate-900">New Message</h1>
                    </div>
                    <input
                        type="text"
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search by name…"
                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {searching && (
                    <p className="text-xs text-slate-400 text-center py-4">Searching…</p>
                )}

                {results.map(u => (
                    <Link key={u.id} href={`/messages/${u.id}`}
                        className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 hover:bg-slate-50 transition">
                        <div className="w-11 h-11 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-500 font-bold shrink-0">
                            {u.profile_picture
                                ? <img src={u.profile_picture} alt="" className="w-full h-full object-cover" />
                                : u.first_name?.[0] ?? '?'}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800">{u.first_name} {u.last_name}</p>
                            <p className="text-xs text-slate-400 capitalize">{u.user_type}</p>
                        </div>
                    </Link>
                ))}

                {query.length >= 2 && !searching && results.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-12">No users found</p>
                )}

                {query.length < 2 && (
                    <p className="text-center text-slate-400 text-sm py-12">Type at least 2 characters to search</p>
                )}
            </div>
        </div>
    )
}
