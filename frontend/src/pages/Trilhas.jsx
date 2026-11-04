// TEMPORÁRIO: página protegida de exemplo para testar a rota privada.
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Trilhas() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <h1>Trilhas</h1>
      <button onClick={() => { signOut(); navigate("/login"); }}>Sair</button>
    </div>
  );
}
