
import { useNavigate } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import { useAuth } from "../contexts/AuthContext";
import "./Trilhas.css";

export default function Trilhas() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const trilhas = [
    {
      id: 1,
      titulo: "Desenvolvimento Web",
      descricao: "Aprenda HTML, CSS e JavaScript.",
      progresso: 65,
    },
    {
      id: 2,
      titulo: "Programação",
      descricao: "Explore lógica e linguagens de programação.",
      progresso: 30,
    },
  ];

  return (
    <main className="trilhas-page">
      <header className="trilhas-header">
        <div>
          <h1>Trilhas</h1>
          <p>Explore novos conhecimentos e evolua seus estudos.</p>
        </div>

        <button
          className="btn-primary trilhas-sair"
          onClick={() => {
            signOut();
            navigate("/login");
          }}
        >
          Sair
        </button>
      </header>

      <div className="trilhas-busca">
        <input
          type="text"
          placeholder="O que quer aprender hoje?"
          disabled
        />
        <span>⌕</span>
      </div>

      <section className="trilhas-lista">
        {trilhas.map((trilha) => (
          <article className="trilha-card" key={trilha.id}>
            <div className="trilha-icone">📚</div>

            <div className="trilha-conteudo">
              <h2>{trilha.titulo}</h2>
              <p>{trilha.descricao}</p>

              <ProgressBar value={trilha.progresso} />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
