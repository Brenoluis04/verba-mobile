import { useState } from "react";
import { enviarDocumento } from "../services/documentService";
import { getErrorMessage } from "../services/api";
import "./Leitor.css";

export default function Leitor() {
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null); // { tipo: "ok" | "erro", texto }

  function adicionarDocumento(event) {
    const documento = event.target.files[0];

    if (!documento) return;

    setMensagem(null);

    setCarregando(true);

    setTimeout(() => {
      setArquivo(documento);
      setCarregando(false);
    }, 1000);
  }

  // Envia o documento aberto para a Biblioteca (POST /api/files/).
  async function salvarNaBiblioteca() {
    if (!arquivo || salvando) return;

    setSalvando(true);
    setMensagem(null);

    try {
      await enviarDocumento(arquivo);
      setMensagem({ tipo: "ok", texto: "Documento salvo na Biblioteca." });
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: getErrorMessage(err, "Não foi possível salvar o documento."),
      });
    } finally {
      setSalvando(false);
    }
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
              <button type="button" onClick={salvarNaBiblioteca} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar na Biblioteca"}
              </button>
            </div>

            {mensagem && (
              <p role={mensagem.tipo === "erro" ? "alert" : "status"}>{mensagem.texto}</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}