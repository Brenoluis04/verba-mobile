
import { useState } from "react";
import "./Biblioteca.css";

export default function Biblioteca() {
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("Todos");

  const documentos = [
    { id: 1, nome: "Introdução à Programação.pdf", tipo: "PDF", progresso: 80 },
    { id: 2, nome: "História em Quadrinhos.pdf", tipo: "HQ", progresso: 45 },
    { id: 3, nome: "Banco de Dados.pdf", tipo: "PDF", progresso: 60 },
    { id: 4, nome: "Desenvolvimento Web.pdf", tipo: "PDF", progresso: 25 },
  ];

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
        {documentosFiltrados.length > 0 ? (
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
