import shutil
import tempfile
import io
import sys
import types
from contextlib import contextmanager

from pypdf import PdfWriter
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import FileUpload
from .traducao import Resumidor, TraducaoErro, Tradutor, dividir_texto

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
        grande = SimpleUploadedFile("g.pdf", b"0" * (50 * 1024 * 1024 + 1))
        r = self.enviar(conteudo=grande)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("50 MB", str(r.data["conteudo"][0]))

    def test_arquivo_de_20_mb_agora_e_aceito(self):
        # O limite antigo era 20 MB; agora é 50 MB.
        medio = SimpleUploadedFile("m.pdf", b"0" * (20 * 1024 * 1024 + 1))
        r = self.enviar(conteudo=medio)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)

    def test_imagem_nao_e_mais_aceita(self):
        r = self.enviar(conteudo=SimpleUploadedFile("capa.png", b"\x89PNG"))
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("conteudo", r.data)

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

    # --- renomear ---
    def renomear(self, pk, **dados):
        return self.client.patch(reverse("files:detalhe", args=[pk]), dados, format="json")

    def test_renomear_o_proprio_documento(self):
        self.enviar()
        arq = FileUpload.objects.get()
        r = self.renomear(arq.pk, nome_exib="  Meu livro novo  ")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(r.data["nome_exib"], "Meu livro novo")  # espaços das pontas saem
        arq.refresh_from_db()
        self.assertEqual(arq.nome_exib, "Meu livro novo")

    def test_renomear_nao_mexe_no_arquivo_nem_na_categoria_nem_no_dono(self):
        self.enviar()
        arq = FileUpload.objects.get()
        caminho = arq.conteudo.name
        r = self.renomear(arq.pk, nome_exib="Novo", categoria="HQ", user=self.joao.pk, conteudo="outro")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        arq.refresh_from_db()
        self.assertEqual(arq.conteudo.name, caminho)
        self.assertEqual(arq.categoria, "PDF")
        self.assertEqual(arq.user, self.maria)

    def test_renomear_nome_vazio_ou_grande_demais(self):
        self.enviar()
        arq = FileUpload.objects.get()
        self.assertEqual(self.renomear(arq.pk, nome_exib="   ").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.renomear(arq.pk, nome_exib="x" * 31).status_code, status.HTTP_400_BAD_REQUEST)
        arq.refresh_from_db()
        self.assertEqual(arq.nome_exib, "livro.pdf")

    def test_renomear_documento_alheio_da_404(self):
        alheio = FileUpload.objects.create(user=self.joao, nome_exib="dele.pdf", categoria="PDF", conteudo=pdf())
        r = self.renomear(alheio.pk, nome_exib="roubado")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        alheio.refresh_from_db()
        self.assertEqual(alheio.nome_exib, "dele.pdf")

    def test_renomear_sem_login_e_negado(self):
        self.enviar()
        arq = FileUpload.objects.get()
        self.client.force_authenticate(None)
        self.assertEqual(self.renomear(arq.pk, nome_exib="x").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_put_nao_e_permitido(self):
        self.enviar()
        arq = FileUpload.objects.get()
        r = self.client.put(reverse("files:detalhe", args=[arq.pk]), {"nome_exib": "x"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

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


@override_settings(MEDIA_ROOT=MEDIA_TEMP, GEMINI_API_KEY="chave-de-teste")
class TraducaoTests(APITestCase):
    """A IA é sempre simulada (patch em Tradutor._chamar_gemini): nenhum teste gasta chamadas."""

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_TEMP, ignore_errors=True)

    def setUp(self):
        self.maria = User.objects.create_user("maria@email.com", password="SenhaForte#2026")
        self.joao = User.objects.create_user("joao@email.com", password="SenhaForte#2026")
        self.client.force_authenticate(self.maria)
        self.doc = self.criar("Com texto", "a.pdf", pdf_com_texto("Hello world"))

    def criar(self, nome, arquivo, conteudo, user=None, categoria="PDF"):
        return FileUpload.objects.create(
            user=user or self.maria,
            nome_exib=nome,
            categoria=categoria,
            conteudo=SimpleUploadedFile(arquivo, conteudo),
        )

    def traduzir(self, pk):
        return self.client.post(reverse("files:traduzir", args=[pk]))

    def test_sem_login_e_negado(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.traduzir(self.doc.pk).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_so_aceita_post(self):
        r = self.client.get(reverse("files:traduzir", args=[self.doc.pk]))
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    @patch("files.traducao.Tradutor._chamar_gemini", return_value="Olá mundo")
    def test_traduz_o_texto_do_pdf(self, ia):
        r = self.traduzir(self.doc.pk)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(r.data["traducao"], "Olá mundo")
        self.assertEqual(r.data["id"], self.doc.pk)
        self.assertIn("Hello world", ia.call_args[0][0])  # a IA recebeu o texto do PDF

    @patch("files.traducao.Tradutor._chamar_gemini", return_value="x")
    def test_arquivo_de_outro_usuario_da_404_e_nao_chama_a_ia(self, ia):
        alheio = self.criar("Dele", "d.pdf", pdf_com_texto(), user=self.joao)
        r = self.traduzir(alheio.pk)
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        ia.assert_not_called()

    @patch("files.traducao.Tradutor._chamar_gemini", return_value="x")
    def test_pdf_escaneado_da_erro_claro_sem_chamar_a_ia(self, ia):
        buf = io.BytesIO()
        w = PdfWriter()
        w.add_blank_page(width=200, height=200)
        w.write(buf)
        esc = self.criar("Escaneado", "e.pdf", buf.getvalue())
        r = self.traduzir(esc.pk)
        self.assertEqual(r.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn("escaneado", r.data["erro"])
        ia.assert_not_called()

    @patch("files.traducao.Tradutor._chamar_gemini", return_value="x")
    def test_arquivo_que_nao_e_pdf_da_400(self, ia):
        img = self.criar("Imagem", "p.png", b"\x89PNG", categoria="HQ")
        self.assertEqual(self.traduzir(img.pk).status_code, status.HTTP_400_BAD_REQUEST)
        ia.assert_not_called()

    @patch("files.traducao.Tradutor._chamar_gemini")
    def test_limite_diario_acabou(self, ia):
        ia.side_effect = TraducaoErro("O limite diário de traduções com IA acabou.", status=429)
        r = self.traduzir(self.doc.pk)
        self.assertEqual(r.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("limite", r.data["erro"])

    @patch("files.traducao.Tradutor._chamar_gemini")
    def test_sem_internet(self, ia):
        ia.side_effect = TraducaoErro("Não foi possível conectar ao serviço de tradução.", status=503)
        r = self.traduzir(self.doc.pk)
        self.assertEqual(r.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("conectar", r.data["erro"])

    @override_settings(GEMINI_API_KEY="")
    @patch("files.traducao.Tradutor._chamar_gemini", return_value="x")
    def test_sem_chave_configurada_avisa(self, ia):
        r = self.traduzir(self.doc.pk)
        self.assertEqual(r.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("GEMINI_API_KEY", r.data["erro"])
        ia.assert_not_called()

    @patch("files.traducao.Tradutor._chamar_gemini", side_effect=lambda t: "[" + t[:3] + "]")
    def test_texto_longo_e_dividido_em_partes(self, ia):
        longo = "\n\n".join(f"Parágrafo número {i}. " + "palavra " * 200 for i in range(20))
        pdf_longo = pdf_com_texto("curto")
        doc = self.criar("Longo", "l.pdf", pdf_longo)
        with patch("files.views.extrair_texto_pdf", return_value=longo):
            r = self.traduzir(doc.pk)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertGreater(ia.call_count, 1)  # foi mais de uma chamada à IA


@contextmanager
def gemini_falso(generate_content):
    """Troca a biblioteca google-genai por uma de mentira (sem internet, sem gastar cota)."""

    class APIError(Exception):
        def __init__(self, code):
            super().__init__(f"erro {code}")
            self.code = code

    class Client:
        def __init__(self, api_key=None):
            self.models = types.SimpleNamespace(generate_content=generate_content)

    google = types.ModuleType("google")
    genai = types.ModuleType("google.genai")
    erros = types.ModuleType("google.genai.errors")
    genai.Client, genai.errors, erros.APIError = Client, erros, APIError
    google.genai = genai
    falsos = {"google": google, "google.genai": genai, "google.genai.errors": erros}
    antigos = {k: sys.modules.get(k) for k in falsos}
    sys.modules.update(falsos)
    try:
        yield APIError
    finally:
        for k, v in antigos.items():
            if v is None:
                sys.modules.pop(k, None)
            else:
                sys.modules[k] = v


@override_settings(GEMINI_API_KEY="chave-de-teste", GEMINI_MODEL="modelo-de-teste")
class TradutorTests(APITestCase):
    def test_partes_respeitam_o_limite_e_nao_perdem_texto(self):
        texto = "\n\n".join("Frase um. Frase dois. " * 30 for _ in range(10))
        partes = dividir_texto(texto, tamanho=500)
        self.assertGreater(len(partes), 1)
        self.assertTrue(all(len(p) <= 500 for p in partes))
        self.assertEqual("".join("".join(partes).split()), "".join(texto.split()))

    def test_texto_curto_vira_uma_parte(self):
        self.assertEqual(dividir_texto("Olá.\n\nMundo."), ["Olá.\n\nMundo."])

    def test_traducao_ok_usa_modelo_configurado(self):
        usados = []

        def gerar(model, contents):
            usados.append(model)
            return types.SimpleNamespace(text="  Olá  ")

        with gemini_falso(gerar):
            self.assertEqual(Tradutor("Hello").traduzir(), "Olá")
        self.assertEqual(usados, ["modelo-de-teste"])

    def test_resposta_vazia(self):
        with gemini_falso(lambda model, contents: types.SimpleNamespace(text="")):
            with self.assertRaises(TraducaoErro) as ctx:
                Tradutor("Hello").traduzir()
        self.assertEqual(ctx.exception.status, 502)
        self.assertIn("vazia", ctx.exception.mensagem)

    def test_limite_diario_429(self):
        holder = {}

        def gerar(model, contents):
            raise holder["erro"](429)

        with gemini_falso(gerar) as APIError:
            holder["erro"] = APIError
            with self.assertRaises(TraducaoErro) as ctx:
                Tradutor("Hello").traduzir()
        self.assertEqual(ctx.exception.status, 429)
        self.assertIn("limite diário", ctx.exception.mensagem)

    def test_sem_internet(self):
        def gerar(model, contents):
            raise ConnectionError("sem rede")

        with gemini_falso(gerar):
            with self.assertRaises(TraducaoErro) as ctx:
                Tradutor("Hello").traduzir()
        self.assertEqual(ctx.exception.status, 503)
        self.assertIn("conectar", ctx.exception.mensagem)

    def test_texto_grande_demais_e_recusado(self):
        with self.assertRaises(TraducaoErro) as ctx:
            Tradutor("a" * 70000).traduzir()
        self.assertEqual(ctx.exception.status, 422)


@override_settings(MEDIA_ROOT=MEDIA_TEMP, GEMINI_API_KEY="chave-de-teste")
class ResumoTests(APITestCase):
    """A IA é sempre simulada (patch em Resumidor._gerar): nenhum teste gasta chamadas."""

    def setUp(self):
        self.maria = User.objects.create_user("maria@email.com", password="SenhaForte#2026")
        self.joao = User.objects.create_user("joao@email.com", password="SenhaForte#2026")
        self.client.force_authenticate(self.maria)
        self.doc = self.criar("Com texto", "a.pdf", pdf_com_texto("Hello world"))

    def criar(self, nome, arquivo, conteudo, user=None, categoria="PDF"):
        return FileUpload.objects.create(
            user=user or self.maria,
            nome_exib=nome,
            categoria=categoria,
            conteudo=SimpleUploadedFile(arquivo, conteudo),
        )

    def resumir(self, pk, dados=None):
        return self.client.post(reverse("files:resumir", args=[pk]), dados, format="json")

    def test_sem_login_e_negado(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.resumir(self.doc.pk).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_so_aceita_post(self):
        r = self.client.get(reverse("files:resumir", args=[self.doc.pk]))
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    @patch("files.traducao.Resumidor._gerar", return_value="Resumo curto")
    def test_resume_o_texto_do_pdf_com_tamanho_padrao(self, ia):
        r = self.resumir(self.doc.pk)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(r.data["resumo"], "Resumo curto")
        self.assertEqual(r.data["tamanho"], "medio")
        self.assertIn("Hello world", ia.call_args[0][0])  # a IA recebeu o texto do PDF

    @patch("files.traducao.Resumidor._gerar", return_value="Resumo")
    def test_aceita_tamanho_curto(self, ia):
        r = self.resumir(self.doc.pk, {"tamanho": "curto"})
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual(r.data["tamanho"], "curto")
        self.assertIn("5 frases", ia.call_args[0][0])

    @patch("files.traducao.Resumidor._gerar", return_value="x")
    def test_tamanho_invalido_da_400_sem_chamar_a_ia(self, ia):
        r = self.resumir(self.doc.pk, {"tamanho": "gigante"})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        ia.assert_not_called()

    @patch("files.traducao.Resumidor._gerar", return_value="x")
    def test_arquivo_de_outro_usuario_da_404_e_nao_chama_a_ia(self, ia):
        alheio = self.criar("Dele", "d.pdf", pdf_com_texto(), user=self.joao)
        r = self.resumir(alheio.pk)
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        ia.assert_not_called()

    @patch("files.traducao.Resumidor._gerar", return_value="x")
    def test_arquivo_que_nao_e_pdf_da_400(self, ia):
        img = self.criar("Imagem", "p.png", b"\x89PNG", categoria="HQ")
        self.assertEqual(self.resumir(img.pk).status_code, status.HTTP_400_BAD_REQUEST)
        ia.assert_not_called()

    @patch("files.traducao.Resumidor._gerar")
    def test_limite_diario_acabou(self, ia):
        ia.side_effect = TraducaoErro("O limite diário de uso da IA acabou.", status=429)
        r = self.resumir(self.doc.pk)
        self.assertEqual(r.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("limite", r.data["erro"])

    @override_settings(GEMINI_API_KEY="")
    @patch("files.traducao.Resumidor._gerar", return_value="x")
    def test_sem_chave_configurada_avisa(self, ia):
        r = self.resumir(self.doc.pk)
        self.assertEqual(r.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("GEMINI_API_KEY", r.data["erro"])
        ia.assert_not_called()

    @patch("files.traducao.Resumidor._gerar", side_effect=lambda p: "[resumo]")
    def test_texto_longo_resume_por_partes_e_une_no_final(self, ia):
        longo = "\n\n".join(f"Parágrafo número {i}. " + "palavra " * 200 for i in range(20))
        doc = self.criar("Longo", "l.pdf", pdf_com_texto("curto"))
        with patch("files.views.extrair_texto_pdf", return_value=longo):
            r = self.resumir(doc.pk)
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        partes = len(dividir_texto(longo))
        self.assertGreater(partes, 1)
        self.assertEqual(ia.call_count, partes + 1)  # uma chamada por parte + a união final


class ResumidorTests(APITestCase):
    @override_settings(GEMINI_API_KEY="chave-de-teste")
    def test_texto_curto_faz_uma_unica_chamada(self):
        with patch("files.traducao.Resumidor._gerar", return_value="ok") as ia:
            self.assertEqual(Resumidor("Hello").resumir(), "ok")
        self.assertEqual(ia.call_count, 1)

    def test_tamanho_invalido(self):
        with self.assertRaises(TraducaoErro) as ctx:
            Resumidor("Hello", "gigante")
        self.assertEqual(ctx.exception.status, 400)

    @override_settings(GEMINI_API_KEY="chave-de-teste")
    def test_texto_grande_demais_e_recusado(self):
        with self.assertRaises(TraducaoErro) as ctx:
            Resumidor("a" * 70000).resumir()
        self.assertEqual(ctx.exception.status, 422)


@override_settings(GEMINI_API_KEY="chave-de-teste", GEMINI_MODEL="modelo-de-teste")
class RetentativaTests(APITestCase):
    """Gemini lotado (503) é tentado de novo; a pausa é simulada para o teste não demorar."""

    @patch("files.traducao.time.sleep")
    def test_503_tenta_de_novo_e_funciona(self, sleep):
        chamadas = []
        holder = {}

        def gerar(model, contents):
            chamadas.append(1)
            if len(chamadas) < 3:
                raise holder["erro"](503)
            return types.SimpleNamespace(text="Olá")

        with gemini_falso(gerar) as APIError:
            holder["erro"] = APIError
            self.assertEqual(Tradutor("Hello").traduzir(), "Olá")
        self.assertEqual(len(chamadas), 3)
        self.assertEqual(sleep.call_count, 2)

    @patch("files.traducao.time.sleep")
    def test_503_persistente_vira_502_depois_de_3_tentativas(self, sleep):
        chamadas = []
        holder = {}

        def gerar(model, contents):
            chamadas.append(1)
            raise holder["erro"](503)

        with gemini_falso(gerar) as APIError:
            holder["erro"] = APIError
            with self.assertRaises(TraducaoErro) as ctx:
                Tradutor("Hello").traduzir()
        self.assertEqual(ctx.exception.status, 502)
        self.assertEqual(len(chamadas), 3)

    @patch("files.traducao.time.sleep")
    def test_429_nao_tenta_de_novo(self, sleep):
        chamadas = []
        holder = {}

        def gerar(model, contents):
            chamadas.append(1)
            raise holder["erro"](429)

        with gemini_falso(gerar) as APIError:
            holder["erro"] = APIError
            with self.assertRaises(TraducaoErro) as ctx:
                Tradutor("Hello").traduzir()
        self.assertEqual(ctx.exception.status, 429)
        self.assertEqual(len(chamadas), 1)
        sleep.assert_not_called()

