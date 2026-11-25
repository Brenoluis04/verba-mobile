import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  TAMANHOS_RESUMO,
  TAMANHO_MAXIMO_MB,
  buscarDocumento,
  buscarPdf,
  buscarTexto,
  enviarDocumento,
  resumirDocumento,
  traduzirDocumento,
  validarArquivo,
} from "../services/documentService";
import { getErrorMessage } from "../services/api";
import "./Leitor.css";

// /leitor      -> escolher um PDF e salvar na Biblioteca
// /leitor/:id  -> ver o PDF da Biblioteca, traduzir e resumir com IA
export default function Leitor() {
  const { id } = useParams();
  return id ? <LeitorDocumento key={id} id={id} /> : <LeitorEnvio />;
}

/* ------------------------------------------------------------------ */
/* Envio de um PDF novo                                               */
/* ------------------------------------------------------------------ */

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

const IconeEnvio = () => (
  <Icone>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Icone>
);

const IconeArquivo = () => (
  <Icone>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h5" />
  </Icone>
);

const IconeFechar = () => (
  <Icone>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icone>
);

const formatarTamanho = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const PASSOS = [
  ["Envie", "Escolha um PDF com texto selecionável."],
  ["Leia", "O texto do documento aparece no Leitor."],
  ["Traduza", "A IA traduz tudo para o português."],
  ["Resuma", "Ou peça um resumo curto, médio ou detalhado."],
];

function LeitorEnvio() {
  const navigate = useNavigate();
  const [arquivo, setArquivo] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // Valida e guarda o arquivo escolhido (pelo clique ou arrastando).
  function receber(lista) {
    if (!lista || lista.length === 0) return;
    if (lista.length > 1) {
      setMensagem("Envie um PDF por vez.");
      return;
    }

    const escolhido = lista[0];
    const problema = validarArquivo(escolhido);
    if (problema) {
      setArquivo(null);
      setMensagem(problema);
      return;
    }

    setMensagem("");
    setArquivo(escolhido);
  }

  function escolherArquivo(event) {
    receber(event.target.files);
    // Permite escolher o mesmo arquivo de novo depois de remover ou de um erro.
    event.target.value = "";
  }

  function soltarArquivo(event) {
    event.preventDefault();
    setArrastando(false);
    if (salvando) return;
    receber(event.dataTransfer.files);
  }

  function remover() {
    if (salvando) return;
    setArquivo(null);
    setMensagem("");
  }

  // Envia o PDF para a Biblioteca (POST /api/files/) e abre no Leitor.
  async function salvarEAbrir() {
    if (!arquivo || salvando) return;

    setSalvando(true);
    setProgresso(0);
    setMensagem("");

    try {
      const documento = await enviarDocumento(arquivo, setProgresso);
      navigate(`/leitor/${documento.id}`);
    } catch (err) {
      setMensagem(getErrorMessage(err, "Não foi possível salvar o documento."));
      setSalvando(false);
    }
  }

  return (
    <main className="leitor-page envio-page">
      <header className="envio-cabecalho">
        <h1 className="leitor-titulo">Leitor</h1>
        <p>Envie um PDF para ler, traduzir e resumir.</p>
      </header>

      {/* O campo fica fora da tela (e não "hidden") para continuar acessível pelo teclado. */}
      <input
        type="file"
        id="documento"
        className="sr-only"
        accept=".pdf,application/pdf"
        onChange={escolherArquivo}
        disabled={salvando}
      />

      {!arquivo ? (
        <label
          htmlFor="documento"
          className={arrastando ? "envio-zona arrastando" : "envio-zona"}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={soltarArquivo}
        >
          <span className="envio-icone">
            <IconeEnvio />
          </span>
          <strong>Toque para escolher um PDF</strong>
          <span className="envio-dica">ou arraste o arquivo para cá</span>
          <span className="envio-etiquetas">
            <span>PDF</span>
            <span>até {TAMANHO_MAXIMO_MB} MB</span>
          </span>
        </label>
      ) : (
        <section className="envio-arquivo" aria-label="Arquivo escolhido">
          <div className="envio-arquivo-linha">
            <span className="envio-icone pequeno">
              <IconeArquivo />
            </span>
            <div className="envio-arquivo-info">
              <strong title={arquivo.name}>{arquivo.name}</strong>
              <small>{formatarTamanho(arquivo.size)}</small>
            </div>
            <button
              type="button"
              className="envio-remover"
              onClick={remover}
              disabled={salvando}
              aria-label="Remover arquivo"
              title="Remover"
            >
              <IconeFechar />
            </button>
          </div>

          {salvando && (
            <div className="envio-progresso" role="status">
              <div
                className="envio-trilha"
                role="progressbar"
                aria-label="Envio do arquivo"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progresso}
              >
                <div className="envio-preenchido" style={{ width: `${progresso}%` }} />
              </div>
              <small>{progresso < 100 ? `Enviando... ${progresso}%` : "Salvando e abrindo..."}</small>
            </div>
          )}

          <button type="button" className="btn-primary envio-botao" onClick={salvarEAbrir} disabled={salvando}>
            {salvando ? "Enviando..." : "Salvar na Biblioteca e abrir"}
          </button>
        </section>
      )}

      {mensagem && (
        <p className="leitor-mensagem erro" role="alert">
          {mensagem}
        </p>
      )}

      <ol className="envio-passos">
        {PASSOS.map(([titulo, texto], indice) => (
          <li key={titulo}>
            <span className="envio-numero">{indice + 1}</span>
            <div>
              <strong>{titulo}</strong>
              <p>{texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Leitura e tradução de um PDF da Biblioteca                         */
/* ------------------------------------------------------------------ */

function LeitorDocumento({ id }) {
  const [documento, setDocumento] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [carregandoPdf, setCarregandoPdf] = useState(true);
  const [erroVisualizacao, setErroVisualizacao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erroDocumento, setErroDocumento] = useState("");
  const [erroTexto, setErroTexto] = useState("");

  const [aba, setAba] = useState("original"); // "original" | "traducao" | "resumo"
  const [traducao, setTraducao] = useState("");
  const [traduzindo, setTraduzindo] = useState(false);
  const [erroTraducao, setErroTraducao] = useState("");

  const [resumo, setResumo] = useState("");
  const [tamanhoResumo, setTamanhoResumo] = useState("medio");
  const [resumindo, setResumindo] = useState(false);
  const [erroResumo, setErroResumo] = useState("");

  const [abrindoPdf, setAbrindoPdf] = useState(false);
  const [erroPdf, setErroPdf] = useState("");

  const urlPdf = useRef(null);

  // Carrega os dados do documento e o texto extraído do PDF.
  useEffect(() => {
    let cancelado = false;

    const pegarDocumento = buscarDocumento(id)
      .then((doc) => {
        if (!cancelado) setDocumento(doc);
      })
      .catch((err) => {
        if (!cancelado) {
          setErroDocumento(
            err.response?.status === 404
              ? "Documento não encontrado."
              : getErrorMessage(err, "Não foi possível abrir o documento.")
          );
        }
      });

    // O texto extraído não é mostrado: serve só para saber se o PDF dá para traduzir/resumir
    // (PDF escaneado, por exemplo, volta com erro e desativa os botões).
    const pegarTexto = buscarTexto(id)
      .catch((err) => {
        if (!cancelado) setErroTexto(getErrorMessage(err, "Não foi possível ler o texto do PDF."));
      });

    Promise.all([pegarDocumento, pegarTexto]).finally(() => {
      if (!cancelado) setCarregando(false);
    });

    // O PDF original é buscado à parte (pode ser grande) e exibido na aba "Original".
    let urlLocal = "";
    buscarPdf(id)
      .then((blob) => {
        if (cancelado) return;
        urlLocal = URL.createObjectURL(blob);
        setPdfUrl(urlLocal);
      })
      .catch((err) => {
        if (!cancelado) setErroVisualizacao(getErrorMessage(err, "Não foi possível carregar o PDF."));
      })
      .finally(() => {
        if (!cancelado) setCarregandoPdf(false);
      });

    return () => {
      cancelado = true;
      if (urlLocal) URL.revokeObjectURL(urlLocal);
    };
  }, [id]);

  // Libera da memória o PDF aberto em outra aba.
  useEffect(() => {
    return () => {
      if (urlPdf.current) URL.revokeObjectURL(urlPdf.current);
    };
  }, []);

  async function traduzir() {
    if (traduzindo) return;

    setTraduzindo(true);
    setErroTraducao("");

    try {
      const resultado = await traduzirDocumento(id);
      setTraducao(resultado);
      setAba("traducao");
    } catch (err) {
      setErroTraducao(getErrorMessage(err, "Não foi possível traduzir o documento."));
      setAba("traducao");
    } finally {
      setTraduzindo(false);
    }
  }

  async function resumir() {
    if (resumindo) return;

    setResumindo(true);
    setErroResumo("");

    try {
      const resultado = await resumirDocumento(id, tamanhoResumo);
      setResumo(resultado);
      setAba("resumo");
    } catch (err) {
      setErroResumo(getErrorMessage(err, "Não foi possível resumir o documento."));
      setAba("resumo");
    } finally {
      setResumindo(false);
    }
  }

  async function abrirPdfOriginal() {
    if (abrindoPdf) return;

    // A aba é aberta já no clique (antes de esperar a API) para o navegador não bloquear.
    const janela = window.open("", "_blank");
    setAbrindoPdf(true);
    setErroPdf("");

    try {
      const blob = await buscarPdf(id);
      if (urlPdf.current) URL.revokeObjectURL(urlPdf.current);
      urlPdf.current = URL.createObjectURL(blob);
      if (janela) {
        janela.location.href = urlPdf.current;
      } else {
        setErroPdf("O navegador bloqueou a nova aba. Permita pop-ups para abrir o PDF.");
      }
    } catch (err) {
      janela?.close();
      setErroPdf(getErrorMessage(err, "Não foi possível abrir o PDF."));
    } finally {
      setAbrindoPdf(false);
    }
  }

  if (carregando) {
    return (
      <main className="leitor-page">
        <div className="leitor-loading leitor-loading-pagina" role="status">
          <div className="loading-spinner"></div>
          <p>Carregando documento...</p>
        </div>
      </main>
    );
  }

  if (erroDocumento) {
    return (
      <main className="leitor-page">
        <div className="leitor-estado" role="alert">
          <h2>Algo deu errado</h2>
          <p>{erroDocumento}</p>
          <Link to="/biblioteca" className="btn-primary leitor-botao-link">
            Voltar à Biblioteca
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="leitor-page leitor-doc">
      <Link to="/biblioteca" className="leitor-voltar">
        ← Biblioteca
      </Link>

      <h1 className="leitor-titulo leitor-titulo-doc" title={documento?.nome}>
        {documento?.nome ?? "Documento"}
      </h1>

      <div className="leitor-barra">
        <button
          type="button"
          className="btn-primary"
          onClick={traduzir}
          disabled={traduzindo || Boolean(erroTexto)}
        >
          {traduzindo ? "Traduzindo..." : traducao ? "Traduzir novamente" : "Traduzir com IA"}
        </button>
        <button
          type="button"
          className="leitor-secundario"
          onClick={resumir}
          disabled={resumindo || Boolean(erroTexto)}
        >
          {resumindo ? "Resumindo..." : resumo ? "Resumir novamente" : "Resumir com IA"}
        </button>
        <button type="button" className="leitor-secundario" onClick={abrirPdfOriginal} disabled={abrindoPdf}>
          {abrindoPdf ? "Abrindo..." : "Ver PDF original"}
        </button>
      </div>

      <label className="leitor-tamanho">
        Tamanho do resumo
        <select
          value={tamanhoResumo}
          onChange={(e) => setTamanhoResumo(e.target.value)}
          disabled={resumindo}
        >
          {TAMANHOS_RESUMO.map(({ valor, rotulo }) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>

      {erroTexto && (
        <p className="leitor-mensagem erro" role="alert">
          {erroTexto}
        </p>
      )}

      {erroPdf && (
        <p className="leitor-mensagem erro" role="alert">
          {erroPdf}
        </p>
      )}

      <div className="leitor-abas" role="tablist" aria-label="Texto do documento">
        <button
          type="button"
          role="tab"
          aria-selected={aba === "original"}
          className={aba === "original" ? "aba ativa" : "aba"}
          onClick={() => setAba("original")}
        >
          Original
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === "traducao"}
          className={aba === "traducao" ? "aba ativa" : "aba"}
          onClick={() => setAba("traducao")}
        >
          Tradução
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === "resumo"}
          className={aba === "resumo" ? "aba ativa" : "aba"}
          onClick={() => setAba("resumo")}
        >
          Resumo
        </button>
      </div>

      <section className="leitor-texto" role="tabpanel">
        {aba === "original" ? (
          erroVisualizacao ? (
            <p className="leitor-mensagem erro" role="alert">
              {erroVisualizacao}
            </p>
          ) : carregandoPdf ? (
            <div className="leitor-loading" role="status">
              <div className="loading-spinner"></div>
              <p>Carregando PDF...</p>
            </div>
          ) : (
            <iframe className="leitor-pdf" src={pdfUrl} title="PDF original" />
          )
        ) : aba === "resumo" ? (
          resumindo ? (
            <div className="leitor-loading" role="status">
              <div className="loading-spinner"></div>
              <p>Resumindo com IA... textos longos podem levar alguns segundos.</p>
            </div>
          ) : erroResumo ? (
            <div className="leitor-estado" role="alert">
              <p className="leitor-mensagem erro">{erroResumo}</p>
              <button type="button" className="btn-primary leitor-botao-link" onClick={resumir}>
                Tentar novamente
              </button>
            </div>
          ) : resumo ? (
            <p className="leitor-paragrafos">{resumo}</p>
          ) : (
            <p className="leitor-aviso">
              Ainda não há resumo. Escolha o tamanho e toque em “Resumir com IA”.
            </p>
          )
        ) : traduzindo ? (
          <div className="leitor-loading" role="status">
            <div className="loading-spinner"></div>
            <p>Traduzindo com IA... textos longos podem levar alguns segundos.</p>
          </div>
        ) : erroTraducao ? (
          <div className="leitor-estado" role="alert">
            <p className="leitor-mensagem erro">{erroTraducao}</p>
            <button type="button" className="btn-primary leitor-botao-link" onClick={traduzir}>
              Tentar novamente
            </button>
          </div>
        ) : traducao ? (
          <p className="leitor-paragrafos">{traducao}</p>
        ) : (
          <p className="leitor-aviso">
            Ainda não há tradução. Toque em “Traduzir com IA” para ver o texto em português.
          </p>
        )}
      </section>
    </main>
  );
}
