import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import {
  CATEGORIAS,
  NOME_MAX_CARACTERES,
  excluirDocumento,
  listarDocumentos,
  renomearDocumento,
} from "../services/documentService";
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

const IconeLapis = () => (
  <Icone>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Icone>
);

const IconeLixeira = () => (
  <Icone>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </Icone>
);

// Permite quebrar a linha depois de "_" e "-" (evita cortar a extensão no meio, como "p" + "df").
const nomeQuebravel = (nome) => nome.replace(/([_-])/g, "$1\u200b");

// Janelinha para renomear ou excluir um documento.
//  acao: { tipo: "renomear" | "excluir", doc }
function JanelaAcao({ acao, onFechar, onRenomeado, onExcluido }) {
  const { tipo, doc } = acao;
  const [nome, setNome] = useState(doc.nome);
  const [trabalhando, setTrabalhando] = useState(false);
  const [erro, setErro] = useState("");
  const campo = useRef(null);

  // Foco no campo ao abrir (só ao abrir, para não roubar o foco depois).
  useEffect(() => {
    campo.current?.focus();
    campo.current?.select();
  }, []);

  // Esc fecha a janela.
  useEffect(() => {
    const aoApertar = (e) => {
      if (e.key === "Escape" && !trabalhando) onFechar();
    };
    window.addEventListener("keydown", aoApertar);
    return () => window.removeEventListener("keydown", aoApertar);
  }, [trabalhando, onFechar]);

  async function confirmar(e) {
    e.preventDefault();
    if (trabalhando) return;

    if (tipo === "renomear" && !nome.trim()) {
      setErro("Digite um nome.");
      return;
    }

    setTrabalhando(true);
    setErro("");
    try {
      if (tipo === "renomear") {
        onRenomeado(await renomearDocumento(doc.id, nome));
      } else {
        await excluirDocumento(doc.id);
        onExcluido(doc.id);
      }
    } catch (err) {
      setErro(
        err.response?.status === 404
          ? "Este documento não existe mais."
          : getErrorMessage(err, "Não foi possível concluir. Tente novamente.")
      );
      setTrabalhando(false);
    }
  }

  const excluindo = tipo === "excluir";

  return (
    <div
      className="janela-fundo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !trabalhando) onFechar();
      }}
    >
      <form
        className="janela"
        role="dialog"
        aria-modal="true"
        aria-labelledby="janela-titulo"
        onSubmit={confirmar}
      >
        <h2 id="janela-titulo">{excluindo ? "Excluir documento?" : "Renomear documento"}</h2>

        {excluindo ? (
          <p className="janela-texto">
            “{doc.nome}” e o PDF salvo serão apagados. Essa ação não pode ser desfeita.
          </p>
        ) : (
          <input
            ref={campo}
            className="janela-campo"
            type="text"
            aria-label="Novo nome"
            value={nome}
            maxLength={NOME_MAX_CARACTERES}
            onChange={(e) => setNome(e.target.value)}
          />
        )}

        {erro && (
          <p className="error-message" role="alert">
            {erro}
          </p>
        )}

        <div className="janela-botoes">
          <button type="button" className="biblioteca-acao secundaria" onClick={onFechar} disabled={trabalhando}>
            Cancelar
          </button>
          <button
            type="submit"
            className={excluindo ? "btn-primary biblioteca-acao perigo" : "btn-primary biblioteca-acao"}
            disabled={trabalhando}
          >
            {trabalhando ? "Aguarde..." : excluindo ? "Excluir" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Biblioteca() {
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("Todos");

  const [documentos, setDocumentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [acao, setAcao] = useState(null); // { tipo: "renomear" | "excluir", doc }

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

  const fecharJanela = () => setAcao(null);

  function aoRenomear(atualizado) {
    setDocumentos((lista) => lista.map((d) => (d.id === atualizado.id ? { ...d, nome: atualizado.nome } : d)));
    setAcao(null);
  }

  function aoExcluir(id) {
    setDocumentos((lista) => lista.filter((d) => d.id !== id));
    setAcao(null);
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
            Abra um PDF no Leitor e salve aqui para ler, traduzir e acompanhar o seu progresso.
          </p>
          <Link to="/leitor" className="btn-primary biblioteca-acao">
            Abrir o Leitor
          </Link>
        </div>
      ) : documentosFiltrados.length > 0 ? (
        <section className="biblioteca-documentos">
          {documentosFiltrados.map((doc, indice) => (
            <div
              className="documento-item"
              key={doc.id}
              style={{ animationDelay: `${Math.min(indice, 8) * 45}ms` }}
            >
              <Link to={`/leitor/${doc.id}`} className="documento-card" aria-label={`Abrir ${doc.nome} no Leitor`}>
                <h3 title={doc.nome}>{nomeQuebravel(doc.nome)}</h3>

                <div className={doc.tipo === "HQ" ? "documento-preview hq" : "documento-preview"}>
                  <span className="documento-selo">{doc.tipo}</span>
                  {doc.tipo === "HQ" ? <IconeHq /> : <IconePdf />}
                </div>

                <ProgressBar value={doc.progresso} />
              </Link>

              <div className="documento-acoes">
                <button
                  type="button"
                  className="documento-icone"
                  aria-label={`Renomear ${doc.nome}`}
                  title="Renomear"
                  onClick={() => setAcao({ tipo: "renomear", doc })}
                >
                  <IconeLapis />
                </button>
                <button
                  type="button"
                  className="documento-icone perigo"
                  aria-label={`Excluir ${doc.nome}`}
                  title="Excluir"
                  onClick={() => setAcao({ tipo: "excluir", doc })}
                >
                  <IconeLixeira />
                </button>
              </div>
            </div>
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

      {acao && (
        <JanelaAcao
          key={`${acao.tipo}-${acao.doc.id}`}
          acao={acao}
          onFechar={fecharJanela}
          onRenomeado={aoRenomear}
          onExcluido={aoExcluir}
        />
      )}
    </main>
  );
}
