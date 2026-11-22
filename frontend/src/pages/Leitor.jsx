
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  salvarDocumento,
  buscarDocumento,
} from "../services/documentService";
import "./Leitor.css";

const LIMITE_PDF = 50 * 1024 * 1024;

export default function Leitor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [documento, setDocumento] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!id) return;

    let ativo = true;

    async function carregarDocumento() {
      setCarregando(true);
      setErro("");

      try {
        const resultado = await buscarDocumento(id);

        if (ativo) {
          if (resultado) {
            setDocumento(resultado);
          } else {
            setErro("Documento não encontrado.");
          }
        }
      } catch {
        if (ativo) {
          setErro("Não foi possível abrir o documento.");
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarDocumento();

    return () => {
      ativo = false;
    };
  }, [id]);

  async function adicionarDocumento(event) {
    const arquivo = event.target.files[0];

    if (!arquivo) return;

    setErro("");

    const ehPDF =
      arquivo.type === "application/pdf" &&
      arquivo.name.toLowerCase().endsWith(".pdf");

    if (!ehPDF) {
      setErro("Selecione somente arquivos PDF.");
      event.target.value = "";
      return;
    }

    if (arquivo.size > LIMITE_PDF) {
      setErro("O arquivo ultrapassa o limite de 50 MB.");
      event.target.value = "";
      return;
    }

    setCarregando(true);

    try {
      const novoId = await salvarDocumento(arquivo);
      navigate(`/leitor/${novoId}`);
    } catch {
      setErro("Não foi possível salvar o documento.");
    } finally {
      setCarregando(false);
      event.target.value = "";
    }
  }

  return (
    <main className="leitor-page">
      <h1 className="leitor-titulo">Leitor</h1>

      <section className="leitor-card">
        <p className="leitor-aviso">
          Envie somente arquivos PDF de até 50 MB.
        </p>

        <input
          type="file"
          id="documento"
          accept="application/pdf,.pdf"
          onChange={adicionarDocumento}
          hidden
        />

        {erro && (
          <p className="leitor-erro" role="alert">
            {erro}
          </p>
        )}

        {carregando ? (
          <div className="leitor-loading">
            <p>Carregando documento...</p>
          </div>
        ) : (
          <>
            <label htmlFor="documento" className="leitor-vazio">
              📂 Clique para enviar um documento PDF
            </label>

            {documento && (
              <div className="leitor-com-arquivo">
                <h2>{documento.nome}</h2>

                {documento.url && (
                  <iframe
                    src={documento.url}
                    title="Visualização do PDF"
                    width="100%"
                    height="600"
                  />
                )}
              </div>
            )}

            <div className="leitor-acoes">
              <button type="button">Traduzir com IA</button>
              <button type="button">Gerar Resumo</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
