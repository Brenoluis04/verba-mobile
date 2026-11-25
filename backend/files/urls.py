from django.urls import path

from . import views

app_name = "files"

urlpatterns = [
    path("", views.FileUploadListCreateView.as_view(), name="lista-cria"),
    path("<int:pk>/", views.FileUploadDetailView.as_view(), name="detalhe"),
    path("<int:pk>/download/", views.FileUploadDownloadView.as_view(), name="download"),
    path("<int:pk>/arquivo/", views.FileUploadArquivoView.as_view(), name="arquivo"),
    path("<int:pk>/texto/", views.FileUploadTextoView.as_view(), name="texto"),
    path("<int:pk>/traduzir/", views.FileUploadTraduzirView.as_view(), name="traduzir"),
]