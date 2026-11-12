from pathlib import Path

from rest_framework import serializers

from .models import CATEGORIAS, FileUpload

# Tipos aceitos: PDF (categoria PDF) e imagens (categoria HQ), igual ao <input accept> do Leitor.
EXTENSOES_PERMITIDAS = {".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp"}
TAMANHO_MAXIMO = 20 * 1024 * 1024  # 20 MB


class FileUploadSerializer(serializers.ModelSerializer):
    """Entrada: nome_exib, categoria, conteudo. Saída: o mesmo + id e data_add.

    `user` não aparece: quem define o dono é a view (request.user), nunca o cliente.
    """

    categoria = serializers.ChoiceField(choices=CATEGORIAS)

    class Meta:
        model = FileUpload
        fields = ("id", "nome_exib", "categoria", "conteudo", "data_add")
        read_only_fields = ("id", "data_add")

    def validate_conteudo(self, arquivo):
        if Path(arquivo.name).suffix.lower() not in EXTENSOES_PERMITIDAS:
            raise serializers.ValidationError("Envie um PDF ou uma imagem (JPG, PNG, GIF ou WEBP).")
        if arquivo.size > TAMANHO_MAXIMO:
            raise serializers.ValidationError("O arquivo passa do limite de 20 MB.")
        return arquivo
