'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminChangePassword() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState(5);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Client-side validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('All fields are required');
            return;
        }

        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword === currentPassword) {
            setError('New password must be different from current password');
            return;
        }

        try {
            setLoading(true);
            // For admin password changes, we'll use Supabase auth
            // Note: This assumes the admin is authenticated via Supabase
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            // Success - show confirmation modal
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowSuccessModal(true);
            setRedirectCountdown(5);

            // Start countdown for auto-redirect
            let count = 5;
            const interval = setInterval(() => {
                count -= 1;
                setRedirectCountdown(count);
                if (count === 0) {
                    clearInterval(interval);
                    handleRedirectToDashboard();
                }
            }, 1000);
        } catch (err) {
            console.error('Password update error:', err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleRedirectToDashboard = () => {
        router.push('/admin/dashboard');
    };

    return (
        <>
            <div className="max-w-md mx-auto">
                <div className="bg-white shadow-lg rounded-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h2>

                    {error && (
                        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Current Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Current Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasswords.current ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter your current password"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({
                                        ...showPasswords,
                                        current: !showPasswords.current
                                    })}
                                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                                >
                                    {showPasswords.current ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password (min 6 characters)"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({
                                        ...showPasswords,
                                        new: !showPasswords.new
                                    })}
                                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                                >
                                    {showPasswords.new ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({
                                        ...showPasswords,
                                        confirm: !showPasswords.confirm
                                    })}
                                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                                >
                                    {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-2 mt-6 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {loading ? 'Updating Password...' : 'Update Password'}
                        </button>
                    </form>

                    {/* Password Requirements */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-700 mb-2">Password Requirements:</h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>✓ At least 6 characters long</li>
                            <li>✓ Different from current password</li>
                            <li>✓ Both new passwords must match</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Success Confirmation Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
                        {/* Success Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Success!</h2>

                        {/* Message */}
                        <p className="text-gray-600 text-center mb-6">
                            Your password has been changed successfully.
                        </p>

                        {/* Countdown and redirect info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
                            <p className="text-sm text-blue-700 font-medium">
                                Redirecting to dashboard in
                            </p>
                            <p className="text-3xl font-bold text-blue-600 mt-2">
                                {redirectCountdown}
                            </p>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleRedirectToDashboard}
                            className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                        >
                            Go to Dashboard Now
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
