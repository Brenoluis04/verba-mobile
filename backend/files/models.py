import uuid
from pathlib import Path

from django.conf import settings
from django.db import models

CATEGORIAS = [
    ("PDF", "PDF"),
    ("HQ", "HQ"),
]


def caminho_upload(instance, filename):
    """Guarda em arquivos/<id do usuário>/<nome aleatório>.<ext>.

    O nome aleatório evita colisão e impede adivinhar a URL de um arquivo alheio.
    O nome original continua guardado em `nome_exib`.
    """
    extensao = Path(filename).suffix.lower()
    return f"arquivos/{instance.user_id}/{uuid.uuid4().hex}{extensao}"


class FileUpload(models.Model):
    # null=True só para não quebrar bancos locais que já tenham linhas antigas;
    # pela API todo arquivo novo sempre tem dono.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="arquivos",
        null=True,
    )
    nome_exib = models.CharField(max_length=30)
    categoria = models.CharField(max_length=15, choices=CATEGORIAS)
    conteudo = models.FileField(upload_to=caminho_upload)
    data_add = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-data_add"]

    def __str__(self):
        return self.nome_exib
