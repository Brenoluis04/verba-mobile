from django.http import FileResponse
from rest_framework import generics
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

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
