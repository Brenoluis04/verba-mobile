import { useState } from "react";
import "./Leitor.css";

export default function Leitor() {
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(false);

  function adicionarDocumento(event) {
    const documento = event.target.files[0];

    if (!documento) return;

    setCarregando(true);

    setTimeout(() => {
      setArquivo(documento);
      setCarregando(false);
    }, 1000);
  }

  return (
    <main className="leitor-page">
      <h1 className="leitor-titulo">Leitor</h1>

      <section className="leitor-card">
        <input
          type="file"
          id="documento"
          accept=".pdf,image/*"
          onChange={adicionarDocumento}
          hidden
        />

        {carregando ? (
          <div className="leitor-loading">
            <div className="loading-spinner"></div>
            <p>Carregando documento...</p>
          </div>
        ) : !arquivo ? (
          <label htmlFor="documento" className="leitor-vazio">
            <span>📂 Clique para adicionar um documento</span>
          </label>
        ) : (
          <div className="leitor-com-arquivo">
            <div className="arquivo-preview">
              <span>📄</span>
              <strong>{arquivo.name}</strong>
            </div>

            <div className="leitor-acoes">
              <button type="button">Traduzir com IA</button>
              <button type="button">Gerar Resumo</button>
              <button type="button">Salvar na Biblioteca</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}