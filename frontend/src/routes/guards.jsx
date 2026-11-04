import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Protege rotas que exigem login.
export function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Impede usuário já logado de ver login/cadastro.
export function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/trilhas" replace /> : children;
}
