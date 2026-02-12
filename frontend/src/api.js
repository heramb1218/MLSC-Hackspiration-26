import axios from 'axios';

// In development, Vite's proxy will handle `/api`.
// In production (Vercel), set VITE_API_BASE_URL to your Railway backend URL.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://mlsc-hackspiration-26-production.up.railway.app/api' : '/api'),
    headers: {
        'Content-Type': 'application/json'
    }
});

export default api;
