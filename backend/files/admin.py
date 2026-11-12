from django.contrib import admin

from .models import FileUpload


@admin.register(FileUpload)
class FileUploadAdmin(admin.ModelAdmin):
    list_display = ("nome_exib", "categoria", "user", "data_add")
    list_filter = ("categoria",)
