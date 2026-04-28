// Admin API client functions
const adminClient = {
    setToken: (token) => {
        localStorage.setItem('adminToken', token);
    },

    getToken: () => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('adminToken');
    },

    login: async (email, password) => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) throw new Error(await response.json());
        return response.json();
    },

    getDashboardStats: async () => {
        const token = adminClient.getToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
    },

    getUsers: async (userType = 'all', page = 1, limit = 10) => {
        const token = adminClient.getToken();
        const query = new URLSearchParams({ userType, page, limit });
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    },

    updateVerification: async (userId, emailVerified) => {
        const token = adminClient.getToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}/verification`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ emailVerified })
        });
        if (!response.ok) throw new Error('Failed to update verification');
        return response.json();
    },

    suspendUser: async (userId, reason) => {
        const token = adminClient.getToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}/suspend`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason })
        });
        if (!response.ok) throw new Error('Failed to suspend user');
        return response.json();
    },

    unsuspendUser: async (userId) => {
        const token = adminClient.getToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}/unsuspend`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to unsuspend user');
        return response.json();
    },

    deleteUser: async (userId) => {
        const token = adminClient.getToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete user');
        return response.json();
    },

    addUser: async (userData) => {
        const token = adminClient.getToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        if (!response.ok) throw new Error('Failed to add user');
        return response.json();
    },

    logout: () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
    }
};

export default adminClient;
