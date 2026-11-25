from pathlib import Path

from rest_framework import serializers

from .models import CATEGORIAS, FileUpload

# Só PDF é aceito (igual ao <input accept> do Leitor).
EXTENSOES_PERMITIDAS = {".pdf"}
TAMANHO_MAXIMO = 50 * 1024 * 1024  # 50 MB


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
            raise serializers.ValidationError("Envie um arquivo PDF.")
        if arquivo.size > TAMANHO_MAXIMO:
            raise serializers.ValidationError("O arquivo passa do limite de 50 MB.")
        return arquivo


class RenomearSerializer(FileUploadSerializer):
    """PATCH /api/files/<id>/ : só o nome pode mudar. Arquivo, categoria e dono ficam como estão."""

    # Campo declarado à mão não obedece o read_only_fields da Meta, por isso é refeito aqui.
    categoria = serializers.ChoiceField(choices=CATEGORIAS, read_only=True)

    class Meta(FileUploadSerializer.Meta):
        read_only_fields = ("id", "categoria", "conteudo", "data_add")
