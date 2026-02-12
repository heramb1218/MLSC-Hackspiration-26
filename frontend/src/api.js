import axios from 'axios';

// In development, Vite's proxy will handle `/api`.
// In production (Vercel), set VITE_API_BASE_URL to your Railway backend URL.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

export default api;
