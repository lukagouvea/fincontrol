import axios from 'axios';


const BACKEND_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: BACKEND_URL, // Porta do seu Backend Hono
  withCredentials: true, // <--- OBRIGATÓRIO: Envia/Recebe Cookies (HttpOnly)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor (Opcional, mas recomendado)
// Se a API retornar 401 (Não autorizado), podemos redirecionar pro login automaticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
        const requestUrl = error.config.url;

        if (requestUrl?.includes('/auth/me') || requestUrl?.includes('/auth/login')) {
            return Promise.reject(error);
        }
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
  }
);