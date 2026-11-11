from rest_framework import serializers

class FileUploadSerializer(serializers.Serializer):
    nome_exib = serializers.CharField(max_length = 30)
    categoria = serializers.CharField(max_length = 15)
    conteudo  = serializers.FileField(allow_empty_file = False)
    data_add  = serializers.DateTimeField()
