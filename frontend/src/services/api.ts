import axios from 'axios';


const BACKEND_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: BACKEND_URL, // Porta do seu Backend Hono
  withCredentials: true, // <--- OBRIGATÓRIO: Envia/Recebe Cookies (HttpOnly)
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Configuração para pedidos que precisam chegar ao servidor mesmo se a página
 * recarregar ou fechar logo depois: as exclusões adiadas pelo "Desfazer"
 * (PendingDeletes), que saem quando o aviso some ou no pagehide. O XHR padrão do
 * axios é cancelado junto com a página; fetch com keepalive não.
 */
export const survivesUnload = { adapter: 'fetch', fetchOptions: { keepalive: true } } as const;

// Interceptor (Opcional, mas recomendado)
// Se a API retornar 401 (Não autorizado), podemos redirecionar pro login automaticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
        console.error("Erro de Rede:", error);
        // Opcional: Disparar um Toast Global aqui se tiver biblioteca de toast
        return Promise.reject(new Error("Sem conexão com o servidor. Verifique sua internet."));
    }

    const status = error.response.status;

    if (status >= 500) {
        console.error(`Erro do Servidor (${status}):`, error.response.data);
        // Mantém o response para quem precisa do status (ex.: mensagens de login).
        return Promise.reject(
            Object.assign(new Error("O servidor está enfrentando problemas temporários."), { response: error.response }),
        );
    }

    if (error.response?.status === 401) {
        const requestUrl = error.config?.url;

        if (requestUrl?.includes('/auth/me') || requestUrl?.includes('/auth/login')) {
            return Promise.reject(error);
        }
        if (window.location.pathname !== '/entrar') {
            window.location.href = '/entrar';
        }
    }
    return Promise.reject(error);
  }
);