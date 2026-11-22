
import { Link } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>404</h1>
      <h2>Página não encontrada</h2>
      <p>
        Ops! A página que você está procurando não existe
        ou foi movida.
      </p>

      <Link to="/biblioteca" className="not-found-link">
        Voltar para a Biblioteca
      </Link>
    </main>
  );
}
