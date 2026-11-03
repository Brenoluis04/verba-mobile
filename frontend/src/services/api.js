import axios from "axios";

// URL base da API Django. Configure em frontend/.env (veja .env.example).
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const TOKEN_KEY = "verba_access_token";
const REFRESH_KEY = "verba_refresh_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const setTokens = ({ access, refresh }) => {
  if (access) localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Envia o token JWT automaticamente em toda requisição.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Se a API responder 401 (token inválido/expirado), limpa a sessão e volta ao login.
// Login e registro ficam de fora: lá o 401 significa "email ou senha incorretos".
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isLoginOrRegister = url.includes("/auth/login/") || url.includes("/auth/registro/");
    if (status === 401 && !isLoginOrRegister) {
      clearTokens();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Extrai uma mensagem legível de um erro do axios/DRF.
// Exemplos de resposta: { detail: "..." } ou { email: ["Já existe uma conta..."] }.
export function getErrorMessage(error, fallback = "Algo deu errado. Tente novamente.") {
  if (!error.response) return "Não foi possível conectar à API. Verifique se o servidor está no ar.";
  const data = error.response.data;
  if (typeof data?.detail === "string") return data.detail;
  if (data && typeof data === "object") {
    const first = Object.values(data)[0];
    if (Array.isArray(first) && first.length) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return fallback;
}

export default api;
