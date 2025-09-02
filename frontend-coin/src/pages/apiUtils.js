// src/utils/apiUtils.js - API utility functions with JWT support

const API_BASE_URL = 'http://localhost:8080';

// Helper function to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// Helper function for multipart form data requests
const getAuthHeadersMultipart = () => {
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// Generic API request function
export const apiRequest = async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const config = {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);

        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
            console.warn('Authentication failed - clearing stored auth data');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            // optional: remember where the user was going
            const here = window.location.pathname + window.location.search;
            window.location.href = `/signin?next=${encodeURIComponent(here)}`;
            return null;
        }

        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};

// Auth-specific API calls (public)
export const authAPI = {
    register: (userData) =>
        fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        }),

    signin: (credentials) =>
        fetch(`${API_BASE_URL}/api/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        }),

    verifyEmail: (token) =>
        fetch(`${API_BASE_URL}/api/auth/verify-email?token=${token}`, {
            method: 'GET',
        }),

    resendVerification: (email) =>
        fetch(`${API_BASE_URL}/api/auth/resend-verification?email=${email}`, {
            method: 'POST',
        }),
};

// Photo-specific API calls (requires authentication)
export const photoAPI = {
    submitPhoto: (formData) =>
        fetch(`${API_BASE_URL}/api/photos/submit`, {
            method: 'POST',
            headers: getAuthHeadersMultipart(),
            body: formData,
        }),

    getUserPhotos: () =>
        apiRequest('/api/photos/my-photos'),

    // ✅ FIXED: use apiRequest so Authorization header is included (prevents 401)
    getAllLotteryPhotos: () =>
        apiRequest('/api/photos/lottery', { method: 'GET' }),

    deletePhoto: (photoId) =>
        apiRequest(`/api/photos/${photoId}`, { method: 'DELETE' }),
};

// User-specific API calls (requires authentication)
export const userAPI = {
    getProfile: () =>
        apiRequest('/api/users/profile'),

    updateProfile: (userData) =>
        apiRequest('/api/users/profile', {
            method: 'PUT',
            body: JSON.stringify(userData),
        }),
};

// Utility function to check if user is authenticated
export const isAuthenticated = () => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    return !!(token && userData);
};

// Utility function to get current user
export const getCurrentUser = () => {
    const userData = localStorage.getItem('userData');
    try {
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
};

// Utility function to logout
export const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userSubmissions');
    window.location.href = '/';
};

export default {
    apiRequest,
    authAPI,
    photoAPI,
    userAPI,
    isAuthenticated,
    getCurrentUser,
    logout,
};
