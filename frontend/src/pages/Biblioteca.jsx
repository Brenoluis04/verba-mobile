import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import { CATEGORIAS, listarDocumentos } from "../services/documentService";
import { getErrorMessage } from "../services/api";
import "./Biblioteca.css";

// Ícones em SVG (herdam a cor do texto).
function Icone({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const IconeBusca = () => (
  <Icone>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icone>
);

const IconePdf = () => (
  <Icone>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h5" />
  </Icone>
);

const IconeHq = () => (
  <Icone>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
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

const IconeAlerta = () => (
  <Icone>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6" />
    <path d="M12 16.5v.01" />
  </Icone>
);

// Permite quebrar a linha depois de "_" e "-" (evita cortar a extensão no meio, como "p" + "df").
const nomeQuebravel = (nome) => nome.replace(/([_-])/g, "$1\u200b");

export default function Biblioteca() {
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("Todos");

  const [documentos, setDocumentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  // Busca os documentos na API (GET /api/files/) ao abrir a tela e a cada "Tentar novamente".
  useEffect(() => {
    let cancelado = false;

    listarDocumentos()
      .then((lista) => {
        if (!cancelado) setDocumentos(lista);
      })
      .catch((err) => {
        if (!cancelado) setErro(getErrorMessage(err, "Não foi possível carregar a biblioteca."));
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [tentativa]);

  function tentarNovamente() {
    setErro("");
    setCarregando(true);
    setTentativa((n) => n + 1);
  }

  function limparFiltros() {
    setPesquisa("");
    setFiltro("Todos");
  }

  const documentosFiltrados = documentos.filter((doc) => {
    const correspondePesquisa = doc.nome
      .toLowerCase()
      .includes(pesquisa.toLowerCase());

    const correspondeFiltro =
      filtro === "Todos" || doc.tipo === filtro;

    return correspondePesquisa && correspondeFiltro;
  });

  const bibliotecaVazia = documentos.length === 0;

  return (
    <main className="biblioteca-page">
      <header className="biblioteca-cabecalho">
        <h1>Minha Biblioteca</h1>

        {!carregando && !erro && documentos.length > 0 && (
          <p className="biblioteca-contagem">
            {documentos.length === 1 ? "1 documento" : `${documentos.length} documentos`}
          </p>
        )}
      </header>

      <div className="biblioteca-busca">
        <IconeBusca />
        <input
          className="biblioteca-pesquisa"
          type="text"
          aria-label="Pesquisar documento"
          placeholder="Pesquisar documento..."
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
        />
      </div>

      <div className="biblioteca-filtros">
        {["Todos", ...CATEGORIAS].map((tipo) => (
          <button
            key={tipo}
            type="button"
            className={filtro === tipo ? "filtro ativo" : "filtro"}
            aria-pressed={filtro === tipo}
            onClick={() => setFiltro(tipo)}
          >
            {tipo === "Todos" ? "Todos" : `${tipo}s`}
          </button>
        ))}
      </div>

      {carregando ? (
        <>
          <p className="biblioteca-status" role="status">
            Carregando documentos...
          </p>

          <section className="biblioteca-documentos" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div className="documento-card esqueleto" key={i}>
                <span className="esqueleto-linha" />
                <span className="esqueleto-bloco" />
                <span className="esqueleto-linha curta" />
              </div>
            ))}
          </section>
        </>
      ) : erro ? (
        <div className="biblioteca-estado erro" role="alert">
          <div className="biblioteca-estado-icone">
            <IconeAlerta />
          </div>
          <h2>Algo deu errado</h2>
          <p className="biblioteca-vazia">{erro}</p>
          <button type="button" className="btn-primary biblioteca-acao" onClick={tentarNovamente}>
            Tentar novamente
          </button>
        </div>
      ) : bibliotecaVazia ? (
        <div className="biblioteca-estado">
          <div className="biblioteca-estado-icone">
            <IconeBiblioteca />
          </div>
          <h2>Sua biblioteca está vazia</h2>
          <p className="biblioteca-vazia">
            Abra um PDF ou uma HQ no Leitor e salve aqui para acompanhar o seu progresso.
          </p>
          <Link to="/leitor" className="btn-primary biblioteca-acao">
            Abrir o Leitor
          </Link>
        </div>
      ) : documentosFiltrados.length > 0 ? (
        <section className="biblioteca-documentos">
          {documentosFiltrados.map((doc, indice) => (
            <article
              className="documento-card"
              key={doc.id}
              style={{ animationDelay: `${Math.min(indice, 8) * 45}ms` }}
            >
              <h3 title={doc.nome}>{nomeQuebravel(doc.nome)}</h3>

              <div className={doc.tipo === "HQ" ? "documento-preview hq" : "documento-preview"}>
                <span className="documento-selo">{doc.tipo}</span>
                {doc.tipo === "HQ" ? <IconeHq /> : <IconePdf />}
              </div>

              <ProgressBar value={doc.progresso} />
            </article>
          ))}
        </section>
      ) : (
        <div className="biblioteca-estado">
          <div className="biblioteca-estado-icone">
            <IconeBusca />
          </div>
          <h2>Nenhum documento encontrado</h2>
          <p className="biblioteca-vazia">Tente outra busca ou limpe os filtros.</p>
          <button type="button" className="biblioteca-acao secundaria" onClick={limparFiltros}>
            Limpar filtros
          </button>
        </div>
      )}
    </main>
  );
}
