
import { useEffect, useState } from "react";
import { listarDocumentos } from "../services/documentService";
import { getErrorMessage } from "../services/api";
import "./Biblioteca.css";

export default function Biblioteca() {
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("Todos");

  const [documentos, setDocumentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // Busca os documentos na API (GET /api/files/) ao abrir a tela.
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
  }, []);

  const documentosFiltrados = documentos.filter((doc) => {
    const correspondePesquisa = doc.nome
      .toLowerCase()
      .includes(pesquisa.toLowerCase());

    const correspondeFiltro =
      filtro === "Todos" || doc.tipo === filtro;

    return correspondePesquisa && correspondeFiltro;
  });

  return (
    <main className="biblioteca-page">
      <h1>Minha Biblioteca</h1>

      <input
        className="biblioteca-pesquisa"
        type="text"
        placeholder="Pesquisar documento..."
        value={pesquisa}
        onChange={(e) => setPesquisa(e.target.value)}
      />

      <div className="biblioteca-filtros">
        {["Todos", "PDF", "HQ"].map((tipo) => (
          <button
            key={tipo}
            className={filtro === tipo ? "filtro ativo" : "filtro"}
            onClick={() => setFiltro(tipo)}
          >
            {tipo === "Todos" ? "Todos" : `${tipo}s`}
          </button>
        ))}
      </div>

      <section className="biblioteca-documentos">
        {carregando ? (
          <p className="biblioteca-vazia">Carregando documentos...</p>
        ) : erro ? (
          <p className="biblioteca-vazia">{erro}</p>
        ) : documentosFiltrados.length > 0 ? (
          documentosFiltrados.map((doc) => (
            <article className="documento-card" key={doc.id}>
              <div className="documento-icone">📄</div>

              <h3>{doc.nome}</h3>

              <span>{doc.tipo}</span>

              <div className="progresso-fundo">
                <div
                  className="progresso-preenchido"
                  style={{ width: `${doc.progresso}%` }}
                />
              </div>

              <small>{doc.progresso}% concluído</small>
            </article>
          ))
        ) : (
          <p className="biblioteca-vazia">
            Nenhum documento encontrado.
          </p>
        )}
      </section>
    </main>
  );
}
