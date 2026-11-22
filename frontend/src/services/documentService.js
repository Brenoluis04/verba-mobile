
import api from "./api";

const ENDPOINTS = {
  documentos: "/files/",
};

const NOME_MAX = 30;

export function categoriaDoArquivo(arquivo) {
  return arquivo.type?.startsWith("image/") ? "HQ" : "PDF";
}

export function nomeParaExibicao(nome) {
  if (nome.length <= NOME_MAX) return nome;

  const ponto = nome.lastIndexOf(".");
  const extensao =
    ponto > 0 && nome.length - ponto <= 6 ? nome.slice(ponto) : "";

  return nome.slice(0, NOME_MAX - extensao.length) + extensao;
}

function paraDocumento(item) {
  return {
    id: item.id,
    nome: item.nome_exib,
    tipo: String(item.categoria ?? "").toUpperCase(),
    progresso: item.progresso ?? 0,
    url: item.conteudo,
    data: item.data_add,
  };
}

export async function listarDocumentos() {
  const { data } = await api.get(ENDPOINTS.documentos);
  const lista = Array.isArray(data) ? data : (data?.results ?? []);

  return lista.map(paraDocumento);
}

export async function enviarDocumento(arquivo) {
  const form = new FormData();

  form.append("nome_exib", nomeParaExibicao(arquivo.name));
  form.append("categoria", categoriaDoArquivo(arquivo));
  form.append("conteudo", arquivo);

  const { data } = await api.post(ENDPOINTS.documentos, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });

  return paraDocumento(data);
}

export async function salvarDocumento(arquivo) {
  const documento = await enviarDocumento(arquivo);
  return documento.id;
}

export async function buscarDocumento(id) {
  const documentos = await listarDocumentos();

  return documentos.find((doc) => String(doc.id) === String(id)) || null;
}
