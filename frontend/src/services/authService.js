import api, { setTokens, clearTokens, getToken, getRefreshToken } from "./api";

// Endpoints reais do back-end (branch feature/auth-usuarios), relativos a VITE_API_URL (.../api).
const ENDPOINTS = {
  login: "/auth/login/",
  register: "/auth/registro/",
  logout: "/auth/logout/",
};

// POST /api/auth/login/  body: { email, senha }
// Resposta: { usuario: {id, nome_completo, email}, tokens: { access, refresh } }
export async function login({ email, senha }) {
  const { data } = await api.post(ENDPOINTS.login, { email, senha });
  setTokens(data.tokens);
  return data.usuario;
}

// POST /api/auth/registro/  body: { nome_completo, email, senha }
// Resposta: { usuario, tokens }. O back-end já devolve os tokens, então o usuário fica logado.
export async function register({ nome_completo, email, senha }) {
  const { data } = await api.post(ENDPOINTS.register, { nome_completo, email, senha });
  setTokens(data.tokens);
  return data.usuario;
}

// POST /api/auth/logout/  body: { refresh } (invalida o refresh token no back-end)
// Limpa a sessão local na hora e avisa a API sem travar a tela.
export function logout() {
  const refresh = getRefreshToken();
  const access = getToken();
  if (refresh) {
    // O header é passado à mão porque os tokens são apagados logo abaixo,
    // antes de o interceptor conseguir lê-los. A rota de logout exige autenticação.
    api
      .post(ENDPOINTS.logout, { refresh }, { headers: { Authorization: `Bearer ${access}` } })
      .catch(() => {});
  }
  clearTokens();
}
