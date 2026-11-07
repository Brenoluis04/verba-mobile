from django.db import models

class FileUpload(models.Model):
    nome_exib = models.CharField(max_length = 30)
    categoria = models.CharField(max_length = 15)
    conteudo  = models.FileField(upload_to  = 'arquivos/')
    data_add  = models.DateTimeField(auto_now_add = True)
