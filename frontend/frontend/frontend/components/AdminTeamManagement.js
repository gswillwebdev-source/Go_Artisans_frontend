'use client'

import { useState, useEffect, useCallback } from 'react'

const ALL_PERMISSIONS = [
    { key: 'view_users',          label: 'View Users',               desc: 'Browse user list and profiles' },
    { key: 'view_contact_info',   label: 'View Contact Info',        desc: 'See emails and phone numbers' },
    { key: 'edit_users',          label: 'Edit Users',               desc: 'Update user profile fields' },
    { key: 'delete_users',        label: 'Delete Users',             desc: 'Permanently delete accounts' },
    { key: 'send_email',          label: 'Send Emails',              desc: 'Send emails to individual users' },
    { key: 'send_whatsapp',       label: 'Send WhatsApp',            desc: 'Open WhatsApp chat for users' },
    { key: 'trigger_campaigns',   label: 'Trigger Campaigns',        desc: 'Send bulk email campaigns' },
    { key: 'view_jobs',           label: 'View Jobs',                desc: 'See job postings' },
    { key: 'view_applications',   label: 'View Applications',        desc: 'See job applications' },
    { key: 'view_verifications',  label: 'View Verifications',       desc: 'See badge verification requests' },
    { key: 'view_subscriptions',  label: 'View Subscriptions',       desc: 'See subscription data' },
]

function RoleBadge({ role }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${role === 'manager' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
            {role === 'manager' ? '👑 Manager' : '🤝 Assistant'}
        </span>
    )
}

function StatusBadge({ status }) {
    const map = { active: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', revoked: 'bg-red-100 text-red-700' }
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

export default function AdminTeamManagement({ sessionToken }) {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Invite form state
    const [showInvite, setShowInvite] = useState(false)
    const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'assistant' })
    const [inviteLoading, setInviteLoading] = useState(false)
    const [inviteLink, setInviteLink] = useState('')

    // Edit permissions state
    const [editingId, setEditingId] = useState(null)
    const [editPerms, setEditPerms] = useState({})
    const [editSaving, setEditSaving] = useState(false)

    const authHeaders = { 'Authorization': `Bearer ${sessionToken}`, 'Content-Type': 'application/json' }

    const fetchMembers = useCallback(async () => {
        if (!sessionToken) return
        setLoading(true)
        try {
            const res = await fetch('/api/admin/team', { headers: authHeaders })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setMembers(data.members || [])
        } catch (e) { setError(e.message || 'Failed to load team') }
        finally { setLoading(false) }
    }, [sessionToken])

    useEffect(() => { fetchMembers() }, [fetchMembers])

    const handleInvite = async (e) => {
        e.preventDefault()
        setError(''); setSuccess(''); setInviteLink('')
        if (!inviteForm.email) { setError('Email is required'); return }
        setInviteLoading(true)
        try {
            const res = await fetch('/api/admin/team', { method: 'POST', headers: authHeaders, body: JSON.stringify(inviteForm) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setSuccess(`Invitation sent to ${inviteForm.email}`)
            if (data.inviteLink) setInviteLink(data.inviteLink)
            setInviteForm({ email: '', name: '', role: 'assistant' })
            setShowInvite(false)
            fetchMembers()
        } catch (e) { setError(e.message || 'Failed to send invitation') }
        finally { setInviteLoading(false) }
    }

    const handleDelete = async (member) => {
        if (!confirm(`Remove ${member.name || member.email} from the team? Their account will be deleted.`)) return
        setError(''); setSuccess('')
        try {
            const res = await fetch(`/api/admin/team/${member.id}`, { method: 'DELETE', headers: authHeaders })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setSuccess(`${member.name || member.email} has been removed.`)
            fetchMembers()
        } catch (e) { setError(e.message) }
    }

    const handleToggleRevoke = async (member) => {
        const newStatus = member.status === 'active' ? 'revoked' : 'active'
        const msg = newStatus === 'revoked' ? `Revoke access for ${member.name || member.email}?` : `Restore access for ${member.name || member.email}?`
        if (!confirm(msg)) return
        setError(''); setSuccess('')
        try {
            const res = await fetch(`/api/admin/team/${member.id}`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ status: newStatus }) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setSuccess(`Access ${newStatus === 'revoked' ? 'revoked' : 'restored'}.`)
            fetchMembers()
        } catch (e) { setError(e.message) }
    }

    const openEditPerms = (member) => {
        setEditingId(member.id)
        setEditPerms(member.permissions || {})
    }

    const handleSavePerms = async () => {
        setEditSaving(true); setError(''); setSuccess('')
        try {
            const res = await fetch(`/api/admin/team/${editingId}`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ permissions: editPerms }) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setSuccess('Permissions updated.')
            setEditingId(null)
            fetchMembers()
        } catch (e) { setError(e.message) }
        finally { setEditSaving(false) }
    }

    return (
        <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
                    <p className="text-sm text-gray-500 mt-1">Invite assistants and managers to help manage GoArtisans.</p>
                </div>
                <button
                    onClick={() => { setShowInvite(s => !s); setError(''); setSuccess('') }}
                    className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                >
                    <span>+</span> Invite Member
                </button>
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>}
            {success && (
                <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
                    {success}
                    {inviteLink && (
                        <div className="mt-2">
                            <p className="font-semibold text-xs mb-1">Invitation link (share manually if email failed):</p>
                            <input readOnly value={inviteLink} onClick={e => e.target.select()}
                                className="w-full text-xs bg-white border border-green-300 rounded px-2 py-1 cursor-text" />
                        </div>
                    )}
                </div>
            )}

            {/* Invite Form */}
            {showInvite && (
                <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-5">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">New Invitation</h3>
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                                <input type="email" required value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="colleague@email.com"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                                <input type="text" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Jane Doe"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <div className="flex gap-3">
                                {['assistant', 'manager'].map(r => (
                                    <label key={r} className={`flex-1 flex items-center gap-3 border-2 rounded-xl p-3 cursor-pointer transition ${inviteForm.role === r ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <input type="radio" name="role" value={r} checked={inviteForm.role === r} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))} className="sr-only" />
                                        <div>
                                            <div className="text-sm font-semibold text-gray-800 capitalize">{r === 'manager' ? '👑 Manager' : '🤝 Assistant'}</div>
                                            <div className="text-xs text-gray-500">{r === 'manager' ? 'Broad access, can trigger campaigns' : 'View & communicate only'}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button type="submit" disabled={inviteLoading}
                                className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition">
                                {inviteLoading ? 'Sending…' : 'Send Invitation'}
                            </button>
                            <button type="button" onClick={() => setShowInvite(false)}
                                className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Members list */}
            {loading ? (
                <div className="text-gray-500 text-sm py-8 text-center">Loading team members…</div>
            ) : members.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                    <p className="text-gray-400 text-sm">No team members yet. Invite your first assistant or manager.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {members.map(member => (
                        <div key={member.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-900 text-sm">{member.name || '—'}</span>
                                        <RoleBadge role={member.role} />
                                        <StatusBadge status={member.status} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{member.email}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Invited {new Date(member.created_at).toLocaleDateString()}
                                        {member.accepted_at && ` · Accepted ${new Date(member.accepted_at).toLocaleDateString()}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {member.status === 'active' && (
                                        <button onClick={() => openEditPerms(member)} title="Edit permissions"
                                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition font-medium">
                                            Permissions
                                        </button>
                                    )}
                                    {member.status !== 'pending' && (
                                        <button onClick={() => handleToggleRevoke(member)}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${member.status === 'active' ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                                            {member.status === 'active' ? 'Revoke' : 'Restore'}
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(member)}
                                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition font-medium">
                                        Remove
                                    </button>
                                </div>
                            </div>

                            {/* Inline permissions editor */}
                            {editingId === member.id && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <p className="text-sm font-semibold text-gray-700 mb-3">Edit Permissions</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {ALL_PERMISSIONS.map(p => (
                                            <label key={p.key} className="flex items-start gap-2.5 cursor-pointer group">
                                                <input type="checkbox" checked={!!editPerms[p.key]}
                                                    onChange={e => setEditPerms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700 leading-none">{p.label}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={handleSavePerms} disabled={editSaving}
                                            className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition">
                                            {editSaving ? 'Saving…' : 'Save Permissions'}
                                        </button>
                                        <button onClick={() => setEditingId(null)}
                                            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
