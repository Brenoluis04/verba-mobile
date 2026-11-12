import api from "./api";

// ATENÇÃO: quando este arquivo foi escrito, a branch feature/biblioteca do back-end só tinha
// o model FileUpload e o serializer (sem views nem URLs). O caminho abaixo é o esperado
// (http://localhost:8000/api/files/). Quando o back-end publicar as rotas reais, ajuste só aqui.
const ENDPOINTS = {
  documentos: "/files/",
};

// Limite do campo nome_exib do model FileUpload (backend/files/models.py).
const NOME_MAX = 30;

// Categorias aceitas pelo back-end (backend/files/models.py). Os filtros da Biblioteca usam esta lista.
export const CATEGORIAS = ["PDF", "HQ"];

// Categoria do documento: imagens (HQ/mangá) viram "HQ"; o restante (PDF) vira "PDF".
export function categoriaDoArquivo(arquivo) {
  return arquivo.type?.startsWith("image/") ? "HQ" : "PDF";
}

// O back-end aceita no máximo 30 caracteres em nome_exib. Se passar disso, corta o nome
// e mantém a extensão (ex.: "um-nome-muito-longo-de-arquivo.pdf" -> "um-nome-muito-longo-de-arq.pdf").
export function nomeParaExibicao(nome) {
  if (nome.length <= NOME_MAX) return nome;
  const ponto = nome.lastIndexOf(".");
  const extensao = ponto > 0 && nome.length - ponto <= 6 ? nome.slice(ponto) : "";
  return nome.slice(0, NOME_MAX - extensao.length) + extensao;
}

// Converte o formato da API (nome_exib, categoria, conteudo, data_add) para o que a tela usa.
// O model ainda não tem progresso de leitura, então ele aparece como 0.
function paraDocumento(item) {
  return {
    id: item.id,
    nome: item.nome_exib,
    tipo: String(item.categoria ?? "").toUpperCase(),
    progresso: item.progresso ?? 0,
    url: item.conteudo,
    dataAdd: item.data_add,
  };
}

// GET /api/files/  ->  lista de documentos (aceita lista simples ou paginada { results: [...] })
export async function listarDocumentos() {
  const { data } = await api.get(ENDPOINTS.documentos);
  const lista = Array.isArray(data) ? data : (data?.results ?? []);
  return lista.map(paraDocumento);
}

// POST /api/files/  (multipart/form-data) com nome_exib, categoria e conteudo (o arquivo)
export async function enviarDocumento(arquivo) {
  const form = new FormData();
  form.append("nome_exib", nomeParaExibicao(arquivo.name));
  form.append("categoria", categoriaDoArquivo(arquivo));
  form.append("conteudo", arquivo);
  // O api.js usa application/json como padrão e, nesse caso, o axios converteria o FormData em JSON
  // (o arquivo se perderia). Por isso o tipo multipart é informado aqui; o navegador completa
  // o "boundary" sozinho. O timeout é maior porque upload pode demorar mais que os 15 s padrão.
  const { data } = await api.post(ENDPOINTS.documentos, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });
  return paraDocumento(data);
}
