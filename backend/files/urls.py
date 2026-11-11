from django.urls import path
from . import views

urlpatterns = [
    path(
        "",
        views.FileUploadListCreateView.as_view(),
        name="files-list-create"
    ),

    path(
        "<int:pk>/download/",
        views.FileUploadDownloadView.as_view(),
        name="files-download"
    ),

    path(
        "<int:pk>/",
        views.FileUploadDetailView.as_view(),
        name="files-detail"
    ),
]