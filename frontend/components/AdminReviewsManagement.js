'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { supabase } from '@/lib/supabase';

export default function AdminReviewsManagement() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterWorker, setFilterWorker] = useState('');
    const [filterRater, setFilterRater] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('DESC');
    const [editingId, setEditingId] = useState(null);
    const [editingData, setEditingData] = useState({ rating: '', review: '' });
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteReviewId, setDeleteReviewId] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchReviews();
    }, [currentPage, filterWorker, filterRater, sortBy, sortOrder]);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            setErrorMessage('');

            let query = supabase
                .from('reviews')
                .select(`
                    *,
                    reviewer:users!reviews_reviewer_id_fkey (
                        first_name,
                        last_name,
                        email
                    ),
                    reviewee:users!reviews_reviewee_id_fkey (
                        first_name,
                        last_name,
                        email
                    )
                `)
                .order(sortBy, { ascending: sortOrder === 'ASC' })
                .range((currentPage - 1) * 10, currentPage * 10 - 1);

            if (filterWorker) {
                query = query.eq('reviewee_id', filterWorker);
            }
            if (filterRater) {
                query = query.eq('reviewer_id', filterRater);
            }

            const { data, error } = await query;

            if (error) throw error;

            setReviews(data || []);

            // For pagination, we'd need to get the total count
            // For now, we'll set a basic pagination
            setTotalPages(Math.ceil((data?.length || 0) / 10) || 1);
        } catch (err) {
            setErrorMessage(err.message);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (review) => {
        setEditingId(review.id);
        setEditingData({
            rating: review.rating,
            review: review.review
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        try {
            setLoading(true);
            setErrorMessage('');

            const currentReview = reviews.find((review) => review.id === editingId);
            const updatePayload = {};

            if (!currentReview || currentReview.rating !== editingData.rating) {
                updatePayload.rating = editingData.rating;
            }
            if (!currentReview || (currentReview.review || '') !== (editingData.review || '')) {
                updatePayload.review = editingData.review;
            }

            if (Object.keys(updatePayload).length === 0) {
                setShowEditModal(false);
                setEditingId(null);
                setLoading(false);
                return;
            }

            const { error } = await supabase
                .from('reviews')
                .update({
                    ...updatePayload,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingId);

            if (error) throw error;

            setSuccessMessage('Review updated successfully');
            setShowSuccessModal(true);
            setShowEditModal(false);
            setEditingId(null);
            fetchReviews();
        } catch (err) {
            setErrorMessage(err.message);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReviewClick = (reviewId) => {
        setDeleteReviewId(reviewId);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        try {
            setLoading(true);
            setErrorMessage('');

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const response = await fetch(`${apiUrl}/api/admin/reviews/${deleteReviewId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete review');

            setShowDeleteModal(false);
            setDeleteReviewId(null);
            setSuccessMessage('Review deleted successfully');
            setShowSuccessModal(true);
            fetchReviews();
        } catch (err) {
            setErrorMessage(err.message);
            setShowErrorModal(true);
            setShowDeleteModal(false);
        } finally {
            setLoading(false);
        }
    };



    return (
        <>
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-6">Reviews Management</h1>

                    {/* Filters */}
                    <div className="mb-6 bg-gray-100 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold mb-4">Filters & Sorting</h2>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Worker ID
                                </label>
                                <input
                                    type="number"
                                    value={filterWorker}
                                    onChange={(e) => {
                                        setFilterWorker(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Filter by worker"
                                    className="w-full px-3 py-2 border border-gray-300 rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rater ID
                                </label>
                                <input
                                    type="number"
                                    value={filterRater}
                                    onChange={(e) => {
                                        setFilterRater(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Filter by rater"
                                    className="w-full px-3 py-2 border border-gray-300 rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sort By
                                </label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => {
                                        setSortBy(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded"
                                >
                                    <option value="created_at">Date</option>
                                    <option value="rating">Rating</option>
                                    <option value="id">ID</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Order
                                </label>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => {
                                        setSortOrder(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded"
                                >
                                    <option value="DESC">Newest First</option>
                                    <option value="ASC">Oldest First</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setFilterWorker('');
                                        setFilterRater('');
                                        setSortBy('created_at');
                                        setSortOrder('DESC');
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Reviews Table */}
                    {loading && <div className="text-center py-4">Loading...</div>}

                    {!loading && reviews.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                            No reviews found
                        </div>
                    )}

                    {!loading && reviews.length > 0 && (
                        <>
                            <div className="overflow-x-auto mb-6">
                                <table className="w-full border-collapse border border-gray-300">
                                    <thead className="bg-gray-200">
                                        <tr>
                                            <th className="border border-gray-300 px-4 py-2 text-left">ID</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left">Worker</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left">Rater</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center">Rating</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left">Review</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left">Job</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reviews.map((review) => (
                                            <tr key={review.id} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-4 py-2">{review.id}</td>
                                                <td className="border border-gray-300 px-4 py-2">
                                                    {review.ratee_first_name} {review.ratee_last_name}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2">
                                                    {review.rater_first_name} {review.rater_last_name}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-center">
                                                    <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                        {review.rating}/5
                                                    </span>
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 max-w-xs truncate">
                                                    {review.review || 'No text'}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2">
                                                    {review.job_title}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-sm">
                                                    {new Date(review.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-center">
                                                    <button
                                                        onClick={() => handleEditClick(review)}
                                                        className="mr-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteReviewClick(review.id)}
                                                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex justify-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50 cursor-disabled"
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-2">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-3 py-2 rounded ${currentPage === page
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-300 hover:bg-gray-400'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50 cursor-disabled"
                                >
                                    Next
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Edit Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-8 max-w-md w-full">
                            <h2 className="text-2xl font-bold mb-6">Edit Review</h2>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rating (1-5)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={editingData.rating}
                                    onChange={(e) => setEditingData({
                                        ...editingData,
                                        rating: parseInt(e.target.value)
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Review Text
                                </label>
                                <textarea
                                    value={editingData.review}
                                    onChange={(e) => setEditingData({
                                        ...editingData,
                                        review: e.target.value
                                    })}
                                    rows="5"
                                    className="w-full px-3 py-2 border border-gray-300 rounded"
                                    placeholder="Review content..."
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingId(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={showDeleteModal}
                    type="warning"
                    title="Delete Review?"
                    message="Are you sure you want to delete this review? This action cannot be undone."
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
            </div> {/* end container */}
        </>
    );
}
