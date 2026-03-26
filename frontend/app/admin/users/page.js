'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'

function AdminUsersContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [isChecking, setIsChecking] = useState(true)
    const [userType, setUserType] = useState(searchParams.get('type') || 'all')
    const [currentPage, setCurrentPage] = useState(1)
    const [pagination, setPagination] = useState(null)
    const [showAddModal, setShowAddModal] = useState(searchParams.get('action') === 'add')
    const [suspendModal, setSuspendModal] = useState({ show: false, userId: null, userName: '' })
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        userType: 'worker',
        password: ''
    })
    const [formError, setFormError] = useState('')
    const [formLoading, setFormLoading] = useState(false)
    const [suspensionReason, setSuspensionReason] = useState('')
    const [suspensionLoading, setSuspensionLoading] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteUserId, setDeleteUserId] = useState(null)
    const [deleteUserName, setDeleteUserName] = useState('')
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        // Check if admin is logged in
        const checkAdminAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                const { data: userProfile } = await supabase
                    .from('users')
                    .select('user_type, email')
                    .eq('email', session.user.email)
                    .single()

                if (userProfile?.email === 'admin@example.com' || userProfile?.user_type === 'admin') {
                    setIsChecking(false)
                } else {
                    router.push('/admin/login')
                }
            } else {
                router.push('/admin/login')
            }
        }

        checkAdminAuth()
    }, [router])

    useEffect(() => {
        if (!isChecking) {
            fetchUsers()
        }
    }, [isChecking, userType, currentPage])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            setError('')

            let query = supabase
                .from('users')
                .select('id,first_name,last_name,phone_number,email,user_type,is_suspended,suspension_reason,email_verified,created_at', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((currentPage - 1) * 10, currentPage * 10 - 1)

            if (userType !== 'all') {
                query = query.eq('user_type', userType)
            }

            const { data, error, count } = await query

            if (error) {
                throw error
            }

            setUsers(data || [])
            setPagination({
                currentPage,
                totalPages: Math.ceil(count / 10),
                totalUsers: count,
                hasNext: currentPage * 10 < count,
                hasPrev: currentPage > 1
            })
        } catch (err) {
            setError('Failed to load users')
            console.error('Error fetching users:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        localStorage.removeItem('adminUser')
        router.push('/admin/login')
    }

    const handleAddUser = async (e) => {
        e.preventDefault()
        setFormLoading(true)
        setFormError('')

        try {
            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        phone_number: formData.phoneNumber,
                    }
                }
            })

            if (authError) {
                // Handle rate limiting specifically
                if (authError.status === 429) {
                    throw new Error('Too many signup attempts. Please wait a few minutes before trying again.')
                }
                throw authError
            }

            if (authData.user) {
                // Create user profile
                const { error: profileError } = await supabase
                    .from('users')
                    .insert({
                        id: authData.user.id,
                        email: formData.email,
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        phone_number: formData.phoneNumber,
                        user_type: formData.userType,
                        created_at: new Date().toISOString()
                    })

                if (profileError) {
                    throw profileError
                }

                setFormData({
                    email: '',
                    firstName: '',
                    lastName: '',
                    phoneNumber: '',
                    userType: 'worker',
                    password: ''
                })
                setShowAddModal(false)
                await fetchUsers()
                setSuccessMessage('User created successfully')
                setShowSuccessModal(true)
            }
        } catch (err) {
            setFormError(err.message || 'Failed to create user')
        } finally {
            setFormLoading(false)
        }
    }

    const handleSuspendClick = (userId, userName) => {
        setSuspendModal({ show: true, userId, userName })
        setSuspensionReason('')
    }

    const handleSuspendSubmit = async () => {
        if (!suspensionReason.trim()) {
            setFormError('Suspension reason is required')
            return
        }

        setSuspensionLoading(true)
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    is_suspended: true,
                    suspension_reason: suspensionReason
                })
                .eq('id', suspendModal.userId)

            if (error) throw error

            setSuspendModal({ show: false, userId: null, userName: '' })
            setSuspensionReason('')
            setSuccessMessage(`${suspendModal.userName} has been suspended successfully`)
            setShowSuccessModal(true)
            await fetchUsers()
        } catch (err) {
            setErrorMessage(err.message || 'Failed to suspend user')
            setShowErrorModal(true)
        } finally {
            setSuspensionLoading(false)
        }
    }

    const handleUnsuspend = async (userId, userName) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    is_suspended: false,
                    suspension_reason: null
                })
                .eq('id', userId)

            if (error) throw error

            setSuccessMessage(`${userName} has been unsuspended successfully`)
            setShowSuccessModal(true)
            await fetchUsers()
        } catch (err) {
            setErrorMessage(err.message || 'Failed to unsuspend user')
            setShowErrorModal(true)
        }
    }

    const handleDeleteClick = (userId, userName) => {
        setDeleteUserId(userId)
        setDeleteUserName(userName)
        setShowDeleteModal(true)
    }

    const handleConfirmDelete = async () => {
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', deleteUserId)

            if (error) throw error

            setDeleteUserName('')
            setSuccessMessage(`${deleteUserName} has been deleted successfully`)
            setShowSuccessModal(true)
            await fetchUsers()
        } catch (err) {
            setErrorMessage(err.message || 'Failed to delete user')
            setShowErrorModal(true)
            setShowDeleteModal(false)
        }
    }

    const handleVerificationToggle = async (userId, currentStatus, userName) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ email_verified: !currentStatus })
                .eq('id', userId)

            if (error) throw error

            setShowSuccessModal(true)
            await fetchUsers()
        } catch (err) {
            setErrorMessage(err.message || 'Failed to update verification status')
            setShowErrorModal(true)
        }
    }

    if (isChecking) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-red-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <Link href="/admin/dashboard" className="text-2xl font-bold">
                            GoArtisans Admin
                        </Link>
                        <div className="flex gap-4 items-center">
                            <Link href="/admin/dashboard" className="hover:bg-red-700 px-3 py-2 rounded">
                                Dashboard
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="bg-red-700 hover:bg-red-800 px-3 py-2 rounded font-semibold"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 lg:px-8 py-8 sm:py-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">User Management</h1>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold text-sm sm:text-base"
                    >
                        + Add User
                    </button>
                </div>

                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {['all', 'worker', 'client'].map((type) => (
                        <button
                            key={type}
                            onClick={() => {
                                setUserType(type)
                                setCurrentPage(1)
                            }}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg font-semibold capitalize transition ${userType === type
                                ? 'bg-red-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {type === 'all' ? 'All Users' : type + 's'}
                        </button>
                    ))}
                </div>

                {/* Users Table */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block">
                            <div className="animate-spin h-12 w-12 border-b-2 border-red-600 rounded-full"></div>
                        </div>
                        <p className="text-gray-600 mt-4">Loading users...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
                        <p className="text-sm sm:text-base text-gray-600 mb-4">No users found</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                        >
                            Add First User
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-100 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email Verified</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                                                <p className="text-sm text-gray-500">{user.phone_number || 'N/A'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${user.user_type === 'worker'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {user.user_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.is_suspended ? (
                                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                        Suspended
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleVerificationToggle(user.id, user.email_verified, `${user.first_name} ${user.last_name}`)}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${user.email_verified
                                                        ? 'bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800 hover:bg-green-100 hover:text-green-800'
                                                        }`}
                                                >
                                                    {user.email_verified ? '✓ Verified' : '✗ Unverified'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2 flex-wrap">
                                                    {user.is_suspended ? (
                                                        <button
                                                            onClick={() => handleUnsuspend(user.id, `${user.first_name} ${user.last_name}`)}
                                                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded text-xs font-semibold"
                                                        >
                                                            Unsuspend
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSuspendClick(user.id, `${user.first_name} ${user.last_name}`)}
                                                            className="bg-orange-50 text-orange-600 hover:bg-orange-100 px-2 py-1 rounded text-xs font-semibold"
                                                        >
                                                            Suspend
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteClick(user.id, `${user.first_name} ${user.last_name}`)}
                                                        className="bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded text-xs font-semibold"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                                {user.is_suspended && user.suspension_reason && (
                                                    <p className="text-xs text-gray-500 mt-1">Reason: {user.suspension_reason}</p>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="mt-6 flex justify-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <span className="px-4 py-2 text-gray-600">
                                    Page {pagination.currentPage} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                                    disabled={currentPage === pagination.totalPages}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New User</h2>

                        {formError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{formError}</div>
                        )}

                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                                    placeholder="user@example.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                                        placeholder="John"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                                    placeholder="+228 XXXX XXXX"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                                <select
                                    value={formData.userType}
                                    onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                                >
                                    <option value="worker">Worker</option>
                                    <option value="client">Client</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                >
                                    {formLoading ? 'Adding...' : 'Add User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Suspend User Modal */}
            {suspendModal.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Suspend User</h2>
                        <p className="text-gray-600 mb-4">Suspend {suspendModal.userName}?</p>

                        {formError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{formError}</div>
                        )}

                        <textarea
                            value={suspensionReason}
                            onChange={(e) => setSuspensionReason(e.target.value)}
                            placeholder="Reason for suspension..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 mb-4 min-h-24"
                        />

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setSuspendModal({ show: false, userId: null, userName: '' })
                                    setFormError('')
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSuspendSubmit}
                                disabled={suspensionLoading}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {suspensionLoading ? 'Suspending...' : 'Suspend'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                type="warning"
                title="Delete User?"
                message={`Are you sure you want to delete ${deleteUserName}? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                isLoading={loading}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteModal(false)}
            />

            {/* Success Modal */}
            <Modal
                isOpen={showSuccessModal}
                type="success"
                title="Success!"
                message={successMessage}
                confirmText="OK"
                onConfirm={() => setShowSuccessModal(false)}
            />

            {/* Error Modal */}
            <Modal
                isOpen={showErrorModal}
                type="error"
                title="Error"
                message={errorMessage}
                confirmText="OK"
                onConfirm={() => setShowErrorModal(false)}
            />
        </div>
    )
}

export default function AdminUsersPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto p-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">Loading Users...</h1>
                </div>
            </div>
        }>
            <AdminUsersContent />
        </Suspense>
    )
}
