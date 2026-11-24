import { Link } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
  return (
    <main className="notfound-page">
      <div className="notfound-card">
        <h1 className="notfound-codigo">404</h1>
        <h2>Página não encontrada</h2>
        <p>O endereço que você tentou abrir não existe ou foi movido.</p>
        <Link to="/login" className="btn-primary notfound-acao">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
