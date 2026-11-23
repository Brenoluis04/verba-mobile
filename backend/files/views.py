from django.http import FileResponse
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound
from rest_framework.response import Response


from .models import FileUpload
from .serial import FileUploadSerializer


class MeusArquivosMixin:
    """Toda view daqui exige login e só enxerga arquivos do próprio usuário.

    Arquivo de outra pessoa responde 404 (e não 403) para não revelar que ele existe.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = FileUploadSerializer

    def get_queryset(self):
        return FileUpload.objects.filter(user=self.request.user)


class FileUploadListCreateView(MeusArquivosMixin, generics.ListCreateAPIView):
    """GET /api/files/  -> lista os arquivos do usuário.
    POST /api/files/ (multipart: nome_exib, categoria, conteudo) -> envia um arquivo."""

    parser_classes = [MultiPartParser, FormParser]
    pagination_class = None  # o front aceita lista simples

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FileUploadDetailView(MeusArquivosMixin, generics.RetrieveDestroyAPIView):
    """GET /api/files/<id>/ -> dados do arquivo.
    DELETE /api/files/<id>/ -> apaga o registro e o arquivo do disco."""

    def perform_destroy(self, instance):
        instance.conteudo.delete(save=False)
        instance.delete()


class FileUploadDownloadView(MeusArquivosMixin, generics.GenericAPIView):
    """GET /api/files/<id>/download/ -> baixa o arquivo original."""

    def get(self, request, pk):
        arquivo = self.get_object()
        return FileResponse(arquivo.conteudo.open("rb"), as_attachment=True, filename=arquivo.nome_exib)

def extrair_texto_pdf(arquivo):
    """Devolve o texto de um PDF ('' se não houver texto). O Back 2 reutiliza."""
    leitor = PdfReader(arquivo)
    paginas = [(p.extract_text() or "").strip() for p in leitor.pages]
    return "\n\n".join(t for t in paginas if t)


def _abrir_conteudo(arquivo):
    """Abre o arquivo do disco; se sumiu, responde 404 em vez de erro 500."""
    try:
        return arquivo.conteudo.open("rb")
    except FileNotFoundError:
        raise NotFound("Arquivo não encontrado.")


class FileUploadArquivoView(MeusArquivosMixin, generics.GenericAPIView):
    """GET /api/files/<id>/arquivo/ -> entrega o PDF (só para o dono)."""

    def get(self, request, pk):
        arquivo = self.get_object()  # 404 se for de outro usuário
        if not arquivo.conteudo.name.lower().endswith(".pdf"):
            return Response(
                {"erro": "Este arquivo não é um PDF."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # sem as_attachment: o Leitor exibe o PDF em vez de baixar
        return FileResponse(_abrir_conteudo(arquivo), content_type="application/pdf")


class FileUploadTextoView(MeusArquivosMixin, generics.GenericAPIView):
    """GET /api/files/<id>/texto/ -> texto extraído do PDF (só para o dono)."""

    def get(self, request, pk):
        arquivo = self.get_object()  # 404 se for de outro usuário
        if not arquivo.conteudo.name.lower().endswith(".pdf"):
            return Response(
                {"erro": "Este arquivo não é um PDF."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with _abrir_conteudo(arquivo) as f:
                texto = extrair_texto_pdf(f)
        except PdfReadError:
            return Response(
                {"erro": "Não foi possível ler este arquivo. Envie um PDF válido."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if not texto.strip():
            return Response(
                {
                    "erro": "Este PDF não tem texto selecionável (parece ser escaneado). "
                            "Envie um PDF com texto."
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        return Response({"id": arquivo.pk, "texto": texto})