import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./LayoutPrivado.css";

// Ícones em SVG (herdam a cor do texto do item).
function Icone({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const IconeLeitor = () => (
  <Icone>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </Icone>
);

const IconeBiblioteca = () => (
  <Icone>
    <path d="m16 6 4 14" />
    <path d="M12 6v14" />
    <path d="M8 8v12" />
    <path d="M4 4v16" />
  </Icone>
);

const IconeSair = () => (
  <Icone>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Icone>
);

export default function LayoutPrivado() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  function sair() {
    signOut();
    navigate("/login");
  }

  return (
    <div className="layout-privado">
      <div className="conteudo-privado">
        <Outlet />
      </div>

      <nav className="navegacao-inferior" aria-label="Navegação principal">
        <NavLink to="/leitor" className="nav-item">
          <IconeLeitor />
          <span>Leitor</span>
        </NavLink>

        <NavLink to="/biblioteca" className="nav-item">
          <IconeBiblioteca />
          <span>Biblioteca</span>
        </NavLink>

        <button type="button" className="nav-sair" onClick={sair}>
          <IconeSair />
          <span>Sair</span>
        </button>
      </nav>
    </div>
  );
}
