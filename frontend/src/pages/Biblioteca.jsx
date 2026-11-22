
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarDocumentos } from "../services/documentService";
import { getErrorMessage } from "../services/api";
import "./Biblioteca.css";

export default function Biblioteca() {
  const navigate = useNavigate();

  const [pesquisa, setPesquisa] = useState("");
  const [documentos, setDocumentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;

    listarDocumentos()
      .then((lista) => {
        if (!cancelado) setDocumentos(lista);
      })
      .catch((err) => {
        if (!cancelado) {
          setErro(
            getErrorMessage(
              err,
              "Não foi possível carregar a biblioteca."
            )
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const documentosFiltrados = documentos.filter((doc) =>
    doc.nome.toLowerCase().includes(pesquisa.toLowerCase())
  );

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

      {carregando ? (
        <p className="biblioteca-vazia">Carregando documentos...</p>
      ) : erro ? (
        <p className="biblioteca-vazia">{erro}</p>
      ) : (
        <section className="biblioteca-documentos">
          {documentosFiltrados.length > 0 ? (
            documentosFiltrados.map((doc) => (
              <article
                className="documento-card"
                key={doc.id}
                onClick={() => navigate(`/leitor/${doc.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="documento-icone">📄</div>

                <h3>{doc.nome}</h3>

                <span>{doc.tipo || "PDF"}</span>

                {doc.data && (
                  <p>
                    Adicionado em:{" "}
                    {new Date(doc.data).toLocaleDateString("pt-BR")}
                  </p>
                )}

                {doc.progresso !== undefined && (
                  <>
                    <div className="progresso-fundo">
                      <div
                        className="progresso-preenchido"
                        style={{ width: `${doc.progresso}%` }}
                      />
                    </div>

                    <small>{doc.progresso}% concluído</small>
                  </>
                )}
              </article>
            ))
          ) : (
            <p className="biblioteca-vazia">
              Nenhum documento encontrado.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
