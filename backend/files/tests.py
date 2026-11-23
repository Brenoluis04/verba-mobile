import shutil
import tempfile
import io

from pypdf import PdfWriter
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import FileUpload

User = get_user_model()
MEDIA_TEMP = tempfile.mkdtemp()


def pdf(nome="livro.pdf", conteudo=b"%PDF-1.4 teste"):
    return SimpleUploadedFile(nome, conteudo, content_type="application/pdf")


@override_settings(MEDIA_ROOT=MEDIA_TEMP)
class FilesAPITests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_TEMP, ignore_errors=True)

    def setUp(self):
        self.maria = User.objects.create_user("maria@email.com", password="SenhaForte#2026")
        self.joao = User.objects.create_user("joao@email.com", password="SenhaForte#2026")
        self.client.force_authenticate(self.maria)

    def enviar(self, **extra):
        dados = {"nome_exib": "livro.pdf", "categoria": "PDF", "conteudo": pdf(), **extra}
        return self.client.post(reverse("files:lista-cria"), dados, format="multipart")

    # --- login obrigatório ---
    def test_sem_login_nada_funciona(self):
        self.client.force_authenticate(None)
        arq = FileUpload.objects.create(user=self.maria, nome_exib="a.pdf", categoria="PDF", conteudo=pdf())
        for r in (
            self.client.get(reverse("files:lista-cria")),
            self.client.post(reverse("files:lista-cria"), {}, format="multipart"),
            self.client.get(reverse("files:detalhe", args=[arq.pk])),
            self.client.delete(reverse("files:detalhe", args=[arq.pk])),
            self.client.get(reverse("files:download", args=[arq.pk])),
        ):
            self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- upload ---
    def test_upload_ok_define_dono_e_nome_aleatorio(self):
        r = self.enviar()
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        arq = FileUpload.objects.get()
        self.assertEqual(arq.user, self.maria)
        self.assertEqual(r.data["nome_exib"], "livro.pdf")
        self.assertNotIn("livro", Path(arq.conteudo.name).name)  # nome em disco é aleatório
        self.assertTrue(arq.conteudo.name.startswith(f"arquivos/{self.maria.pk}/"))

    def test_cliente_nao_consegue_escolher_o_dono(self):
        r = self.enviar(user=self.joao.pk)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FileUpload.objects.get().user, self.maria)

    def test_extensao_invalida(self):
        r = self.enviar(conteudo=SimpleUploadedFile("virus.exe", b"MZ"))
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("conteudo", r.data)

    def test_categoria_invalida(self):
        r = self.enviar(categoria="XYZ")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nome_maior_que_30(self):
        r = self.enviar(nome_exib="x" * 31)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_arquivo_grande_demais(self):
        grande = SimpleUploadedFile("g.pdf", b"0" * (20 * 1024 * 1024 + 1))
        r = self.enviar(conteudo=grande)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    # --- isolamento entre usuários ---
    def test_lista_mostra_so_os_meus(self):
        self.enviar()
        FileUpload.objects.create(user=self.joao, nome_exib="dele.pdf", categoria="PDF", conteudo=pdf())
        r = self.client.get(reverse("files:lista-cria"))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIsInstance(r.data, list)  # o front aceita lista simples
        self.assertEqual([a["nome_exib"] for a in r.data], ["livro.pdf"])

    def test_arquivo_alheio_da_404_em_tudo(self):
        alheio = FileUpload.objects.create(user=self.joao, nome_exib="dele.pdf", categoria="PDF", conteudo=pdf())
        for r in (
            self.client.get(reverse("files:detalhe", args=[alheio.pk])),
            self.client.delete(reverse("files:detalhe", args=[alheio.pk])),
            self.client.get(reverse("files:download", args=[alheio.pk])),
        ):
            self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(FileUpload.objects.filter(pk=alheio.pk).exists())

    # --- download e exclusão ---
    def test_download_do_proprio_arquivo(self):
        self.enviar()
        arq = FileUpload.objects.get()
        r = self.client.get(reverse("files:download", args=[arq.pk]))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(b"".join(r.streaming_content), b"%PDF-1.4 teste")
        self.assertIn("livro.pdf", r["Content-Disposition"])

    def test_delete_remove_registro_e_arquivo_do_disco(self):
        self.enviar()
        arq = FileUpload.objects.get()
        caminho = Path(arq.conteudo.path)
        self.assertTrue(caminho.exists())
        r = self.client.delete(reverse("files:detalhe", args=[arq.pk]))
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(FileUpload.objects.exists())
        self.assertFalse(caminho.exists())
def pdf_com_texto(texto="Ola mundo"):
    """PDF mínimo válido com texto selecionável."""
    stream = f"BT /F1 12 Tf 20 100 Td ({texto}) Tj ET".encode("latin-1")
    objs = [
        b"<</Type/Catalog/Pages 2 0 R>>",
        b"<</Type/Pages/Kids[3 0 R]/Count 1>>",
        b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]"
        b"/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
        b"<</Length %d>>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, obj in enumerate(objs, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + obj + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n" % (len(objs) + 1) + b"0000000000 65535 f \n"
    for off in offsets:
        out += b"%010d 00000 n \n" % off
    out += b"trailer\n<</Root 1 0 R/Size %d>>\nstartxref\n%d\n%%%%EOF\n" % (
        len(objs) + 1, xref)
    return bytes(out)


def pdf_sem_texto():
    """PDF válido com página em branco (simula PDF escaneado)."""
    buf = io.BytesIO()
    w = PdfWriter()
    w.add_blank_page(width=200, height=200)
    w.write(buf)
    return buf.getvalue()


@override_settings(MEDIA_ROOT=MEDIA_TEMP)
class LeituraPDFTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_TEMP, ignore_errors=True)

    def setUp(self):
        self.maria = User.objects.create_user("maria@email.com", password="SenhaForte#2026")
        self.joao = User.objects.create_user("joao@email.com", password="SenhaForte#2026")
        self.client.force_authenticate(self.maria)

        self.doc = self.criar("Com texto", "a.pdf", pdf_com_texto())
        self.escaneado = self.criar("Escaneado", "b.pdf", pdf_sem_texto())
        self.invalido = self.criar("Invalido", "c.pdf", b"isto nao e um pdf")

    def criar(self, nome, arquivo, conteudo, user=None, categoria="PDF"):
        return FileUpload.objects.create(
            user=user or self.maria,
            nome_exib=nome,
            categoria=categoria,
            conteudo=SimpleUploadedFile(arquivo, conteudo),
        )

    # --- login obrigatório ---
    def test_sem_login_e_negado(self):
        self.client.force_authenticate(None)
        for nome in ("files:arquivo", "files:texto"):
            r = self.client.get(reverse(nome, args=[self.doc.pk]))
            self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- /arquivo/ ---
    def test_arquivo_dono_recebe_pdf(self):
        r = self.client.get(reverse("files:arquivo", args=[self.doc.pk]))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r["Content-Type"], "application/pdf")
        self.assertNotIn("attachment", r.get("Content-Disposition", ""))
        self.assertTrue(b"".join(r.streaming_content).startswith(b"%PDF"))

    def test_arquivo_de_outro_usuario_da_404(self):
        alheio = self.criar("Dele", "d.pdf", pdf_com_texto(), user=self.joao)
        r = self.client.get(reverse("files:arquivo", args=[alheio.pk]))
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_arquivo_inexistente_da_404(self):
        r = self.client.get(reverse("files:arquivo", args=[999999]))
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_arquivo_que_nao_e_pdf_da_400(self):
        img = self.criar("Imagem", "p.png", b"\x89PNG", categoria="HQ")
        r = self.client.get(reverse("files:arquivo", args=[img.pk]))
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_arquivo_sumiu_do_disco_da_404(self):
        Path(self.doc.conteudo.path).unlink()
        r = self.client.get(reverse("files:arquivo", args=[self.doc.pk]))
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    # --- /texto/ ---
    def test_texto_dono_recebe_texto(self):
        r = self.client.get(reverse("files:texto", args=[self.doc.pk]))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["id"], self.doc.pk)
        self.assertIn("Ola mundo", r.data["texto"])

    def test_texto_de_outro_usuario_da_404(self):
        alheio = self.criar("Dele", "d.pdf", pdf_com_texto(), user=self.joao)
        r = self.client.get(reverse("files:texto", args=[alheio.pk]))
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_texto_inexistente_da_404(self):
        r = self.client.get(reverse("files:texto", args=[999999]))
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_texto_pdf_escaneado_da_erro_claro(self):
        r = self.client.get(reverse("files:texto", args=[self.escaneado.pk]))
        self.assertEqual(r.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn("escaneado", r.data["erro"])

    def test_texto_arquivo_invalido_da_erro_claro(self):
        r = self.client.get(reverse("files:texto", args=[self.invalido.pk]))
        self.assertEqual(r.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn("PDF válido", r.data["erro"])

    def test_texto_que_nao_e_pdf_da_400(self):
        img = self.criar("Imagem", "p.png", b"\x89PNG", categoria="HQ")
        r = self.client.get(reverse("files:texto", args=[img.pk]))
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)