
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.utils import timezone

import os

from django.shortcuts import get_object_or_404
from django.http import FileResponse
from rest_framework.views import APIView

from .models import FileUpload
from .serial import FileUploadSerializer


class FileUploadListCreateView(generics.GenericAPIView):

    serializer_class = FileUploadSerializer
    parser_classes = [MultiPartParser, FormParser]
    queryset = FileUpload.objects.all()

    def get(self, request):
        arquivos = self.get_queryset()
        serializer = self.get_serializer(arquivos, many=True)

        return Response(serializer.data)

    def post(self, request):
        dados = request.data.copy()

        # Compatibilidade temporária com o serializer do Lucas
        if not dados.get("data_add"):
            dados["data_add"] = timezone.now().isoformat()

        serializer = self.get_serializer(data=dados)

        if serializer.is_valid():
            arquivo = FileUpload.objects.create(
                nome_exib=serializer.validated_data["nome_exib"],
                categoria=serializer.validated_data["categoria"],
                conteudo=serializer.validated_data["conteudo"]
            )

            resposta = self.get_serializer(arquivo)

            return Response(
                resposta.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
 
class FileUploadDownloadView(APIView):

    def get(self, request, pk):
        arquivo = get_object_or_404(FileUpload, pk=pk)

        if not arquivo.conteudo:
            return Response(
                {"erro": "Arquivo não encontrado."},
                status=status.HTTP_404_NOT_FOUND
            )

        nome_arquivo = os.path.basename(arquivo.conteudo.name)

        return FileResponse(
            arquivo.conteudo.open("rb"),
            as_attachment=True,
            filename=nome_arquivo
        )
 
class FileUploadDetailView(APIView):

    def delete(self, request, pk):
        arquivo = get_object_or_404(FileUpload, pk=pk)

        if arquivo.conteudo:
            arquivo.conteudo.delete(save=False)

        arquivo.delete()

        return Response(
            {"mensagem": "Arquivo excluído com sucesso."},
            status=status.HTTP_200_OK
        )
