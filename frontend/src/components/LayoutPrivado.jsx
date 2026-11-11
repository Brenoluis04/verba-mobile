
import { NavLink, Outlet } from "react-router-dom";
import "./LayoutPrivado.css";

export default function LayoutPrivado() {
  return (
    <div className="layout-privado">
      <div className="conteudo-privado">
        <Outlet />
      </div>

      <nav className="navegacao-inferior">
        <NavLink to="/leitor" className="nav-item">
          <span>📖</span>
          <small>Leitor</small>
        </NavLink>

        <NavLink to="/biblioteca" className="nav-item">
          <span>📚</span>
          <small>Biblioteca</small>
        </NavLink>

        <NavLink to="/trilhas" className="nav-item">
          <span>🎓</span>
          <small>Trilhas</small>
        </NavLink>
      </nav>
    </div>
  );
}
