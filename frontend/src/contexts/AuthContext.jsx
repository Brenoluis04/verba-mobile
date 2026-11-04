import { createContext, useContext, useState } from "react";
import { getToken } from "../services/api";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getToken()));

  const signIn = async (credentials) => {
    await authService.login(credentials);
    setIsAuthenticated(true);
  };

  // O back-end devolve os tokens no cadastro, então o usuário já fica logado.
  const signUp = async (data) => {
    await authService.register(data);
    setIsAuthenticated(true);
  };

  const signOut = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
