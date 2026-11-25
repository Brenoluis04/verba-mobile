import api from "./api";

// Rotas do back-end (backend/files/urls.py). Todas exigem login e só enxergam arquivos do próprio usuário.
const ENDPOINTS = {
  documentos: "/files/",
  documento: (id) => `/files/${id}/`,
  arquivo: (id) => `/files/${id}/arquivo/`,
  texto: (id) => `/files/${id}/texto/`,
  traduzir: (id) => `/files/${id}/traduzir/`,
  resumir: (id) => `/files/${id}/resumir/`,
};

// Só PDF, até 50 MB (o back-end valida de novo em backend/files/serial.py).
export const TAMANHO_MAXIMO_MB = 50;
const TAMANHO_MAXIMO = TAMANHO_MAXIMO_MB * 1024 * 1024;

// Devolve a mensagem de erro se o arquivo não pode ser enviado, ou "" se está tudo certo.
export function validarArquivo(arquivo) {
  const ehPdf = arquivo.type === "application/pdf" || arquivo.name.toLowerCase().endsWith(".pdf");
  if (!ehPdf) return "Envie um arquivo PDF.";
  if (arquivo.size > TAMANHO_MAXIMO) {
    return `O arquivo passa do limite de ${TAMANHO_MAXIMO_MB} MB.`;
  }
  return "";
}

// Limite do campo nome_exib do model FileUpload (backend/files/models.py).
const NOME_MAX = 30;

// Categorias dos filtros da Biblioteca. Como só PDF é aceito, só existe "PDF".
export const CATEGORIAS = ["PDF"];

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
// `aoProgredir(percentual)` é opcional: é chamado durante o envio, de 0 a 100.
export async function enviarDocumento(arquivo, aoProgredir) {
  const form = new FormData();
  form.append("nome_exib", nomeParaExibicao(arquivo.name));
  form.append("categoria", "PDF");
  form.append("conteudo", arquivo);
  // O api.js usa application/json como padrão e, nesse caso, o axios converteria o FormData em JSON
  // (o arquivo se perderia). Por isso o tipo multipart é informado aqui; o navegador completa
  // o "boundary" sozinho. O timeout é maior porque upload pode demorar mais que os 15 s padrão.
  const { data } = await api.post(ENDPOINTS.documentos, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000, // 5 min: PDFs grandes (até 50 MB) em conexão lenta
    onUploadProgress: (evento) => {
      if (aoProgredir && evento.total) aoProgredir(Math.round((evento.loaded * 100) / evento.total));
    },
  });
  return paraDocumento(data);
}

// GET /api/files/<id>/  ->  dados de um documento (404 se não existir ou for de outra pessoa)
export async function buscarDocumento(id) {
  const { data } = await api.get(ENDPOINTS.documento(id));
  return paraDocumento(data);
}

// GET /api/files/<id>/texto/  ->  texto extraído do PDF (erro 422 se o PDF for escaneado)
export async function buscarTexto(id) {
  const { data } = await api.get(ENDPOINTS.texto(id), { timeout: 60000 });
  return data.texto;
}

// POST /api/files/<id>/traduzir/  ->  tradução em português feita pela IA (Gemini).
// Textos longos são traduzidos em várias partes, então o timeout é grande.
export async function traduzirDocumento(id) {
  const { data } = await api.post(ENDPOINTS.traduzir(id), null, { timeout: 180000 });
  return data.traducao;
}

// Tamanhos de resumo aceitos pelo back-end (backend/files/traducao.py).
export const TAMANHOS_RESUMO = [
  { valor: "curto", rotulo: "Curto" },
  { valor: "medio", rotulo: "Médio" },
  { valor: "longo", rotulo: "Detalhado" },
];

// POST /api/files/<id>/resumir/  ->  resumo em português feito pela IA (Gemini).
// Textos longos são resumidos em várias partes, então o timeout é grande.
export async function resumirDocumento(id, tamanho = "medio") {
  const { data } = await api.post(ENDPOINTS.resumir(id), { tamanho }, { timeout: 180000 });
  return data.resumo;
}

// GET /api/files/<id>/arquivo/  ->  o PDF original (Blob). Vai pela API para levar o token de login.
export async function buscarPdf(id) {
  const { data } = await api.get(ENDPOINTS.arquivo(id), { responseType: "blob", timeout: 60000 });
  return data;
}

// Limite do nome (backend/files/models.py), usado pelo campo de renomear.
export const NOME_MAX_CARACTERES = NOME_MAX;

// PATCH /api/files/<id>/  (nome_exib)  ->  renomeia o documento
export async function renomearDocumento(id, nome) {
  const { data } = await api.patch(ENDPOINTS.documento(id), { nome_exib: nome.trim() });
  return paraDocumento(data);
}

// DELETE /api/files/<id>/  ->  apaga o documento e o PDF do disco
export async function excluirDocumento(id) {
  await api.delete(ENDPOINTS.documento(id));
}
