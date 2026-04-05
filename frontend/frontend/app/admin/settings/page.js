'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AdminChangePassword from '@/components/AdminChangePassword';

export default function AdminSettingsPage() {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);
    const [activeTab, setActiveTab] = useState('password');
    const [updateNoticeForm, setUpdateNoticeForm] = useState({
        message: '',
        isEnabled: false,
        startsAt: ''
    });
    const [noticeLoading, setNoticeLoading] = useState(false);
    const [noticeSaving, setNoticeSaving] = useState(false);
    const [noticeError, setNoticeError] = useState('');
    const [noticeSuccess, setNoticeSuccess] = useState('');

    useEffect(() => {
        checkAdminAuth();
    }, [router]);

    const checkAdminAuth = async () => {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                router.push('/admin/login');
                return;
            }

            // Check if user is admin
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('user_type')
                .eq('id', user.id)
                .single();

            if (userError || userData?.user_type !== 'admin') {
                router.push('/admin/login');
                return;
            }

            setNoticeLoading(true);
            const { data: noticeData, error: noticeLoadError } = await supabase
                .rpc('get_active_update_notice');

            if (!noticeLoadError && noticeData) {
                const startsAtValue = noticeData.starts_at
                    ? new Date(noticeData.starts_at).toISOString().slice(0, 16)
                    : '';
                setUpdateNoticeForm({
                    message: noticeData.message || '',
                    isEnabled: Boolean(noticeData.is_enabled),
                    startsAt: startsAtValue
                });
            }

            setIsChecking(false);
        } catch (err) {
            router.push('/admin/login');
        } finally {
            setNoticeLoading(false);
        }
    };

    const handleUpdateNoticeSubmit = async (e) => {
        e.preventDefault();
        setNoticeSaving(true);
        setNoticeError('');
        setNoticeSuccess('');

        try {
            const startsAtIso = updateNoticeForm.startsAt
                ? new Date(updateNoticeForm.startsAt).toISOString()
                : null;

            const { error } = await supabase.rpc('set_update_notice', {
                p_message: updateNoticeForm.message,
                p_is_enabled: updateNoticeForm.isEnabled,
                p_starts_at: startsAtIso
            });

            if (error) {
                if (/function .* does not exist/i.test(error.message || '')) {
                    setNoticeError('Update notice RPC is missing. Run SUPABASE_UPDATE_NOTICES_MIGRATION.sql in Supabase SQL Editor.');
                } else {
                    setNoticeError(error.message || 'Failed to save update notice.');
                }
                return;
            }

            setNoticeSuccess(updateNoticeForm.isEnabled
                ? 'Update notice is now active for users.'
                : 'Update notice has been turned off.');
        } catch (err) {
            setNoticeError(err.message || 'Failed to save update notice.');
        } finally {
            setNoticeSaving(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    if (isChecking) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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
                            <Link href="/admin/users" className="hover:bg-red-700 px-3 py-2 rounded">
                                Users
                            </Link>
                            <Link href="/admin/reviews" className="hover:bg-red-700 px-3 py-2 rounded">
                                Reviews
                            </Link>
                            <Link href="/admin/settings" className="bg-red-700 hover:bg-red-800 px-3 py-2 rounded">
                                Settings
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
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Settings</h1>
                    <p className="text-sm sm:text-base text-gray-600 mt-2">Manage your admin account settings</p>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200 overflow-x-auto">
                    <div className="flex gap-2 sm:gap-4 w-max sm:w-full">
                        <button
                            onClick={() => setActiveTab('password')}
                            className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium border-b-2 transition whitespace-nowrap ${activeTab === 'password'
                                ? 'border-red-600 text-red-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Change Password
                        </button>
                        <button
                            onClick={() => setActiveTab('updateNotice')}
                            className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium border-b-2 transition whitespace-nowrap ${activeTab === 'updateNotice'
                                ? 'border-red-600 text-red-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Update Notice
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="py-8">
                    {activeTab === 'password' && (
                        <AdminChangePassword />
                    )}

                    {activeTab === 'updateNotice' && (
                        <div className="max-w-2xl bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Pre-Deployment Push Notice</h2>
                            <p className="text-sm text-gray-600 mb-6">
                                Turn this on before deployment to warn users in-app. Users can also enable browser alerts from the banner.
                            </p>

                            {noticeError && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                                    {noticeError}
                                </div>
                            )}

                            {noticeSuccess && (
                                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">
                                    {noticeSuccess}
                                </div>
                            )}

                            {noticeLoading ? (
                                <div className="text-gray-600">Loading update notice settings...</div>
                            ) : (
                                <form onSubmit={handleUpdateNoticeSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Notice Message</label>
                                        <textarea
                                            rows={4}
                                            value={updateNoticeForm.message}
                                            onChange={(e) => setUpdateNoticeForm(prev => ({ ...prev, message: e.target.value }))}
                                            placeholder="Example: We will deploy a new release at 9:00 PM UTC. You may experience a short interruption."
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Time (optional)</label>
                                        <input
                                            type="datetime-local"
                                            value={updateNoticeForm.startsAt}
                                            onChange={(e) => setUpdateNoticeForm(prev => ({ ...prev, startsAt: e.target.value }))}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Leave empty to show immediately after enabling.</p>
                                    </div>

                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={updateNoticeForm.isEnabled}
                                            onChange={(e) => setUpdateNoticeForm(prev => ({ ...prev, isEnabled: e.target.checked }))}
                                            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Enable notice for users</span>
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={noticeSaving}
                                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                                    >
                                        {noticeSaving ? 'Saving...' : 'Save Update Notice'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
