from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class AuthTests(APITestCase):
    def setUp(self):
        self.dados = {
            "nome_completo": "Maria da Silva",
            "email": "maria@email.com",
            "senha": "SenhaForte#2026",
        }

    def test_registro_sucesso(self):
        r = self.client.post(reverse("accounts:registro"), self.dados, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", r.data["tokens"])
        self.assertNotIn("senha", r.data["usuario"])

    def test_registro_email_duplicado(self):
        self.client.post(reverse("accounts:registro"), self.dados, format="json")
        r = self.client.post(reverse("accounts:registro"), self.dados, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registro_senha_fraca(self):
        self.dados["senha"] = "123"
        r = self.client.post(reverse("accounts:registro"), self.dados, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_sucesso(self):
        self.client.post(reverse("accounts:registro"), self.dados, format="json")
        r = self.client.post(
            reverse("accounts:login"),
            {"email": self.dados["email"], "senha": self.dados["senha"]},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("refresh", r.data["tokens"])

    def test_login_senha_errada(self):
        self.client.post(reverse("accounts:registro"), self.dados, format="json")
        r = self.client.post(
            reverse("accounts:login"),
            {"email": self.dados["email"], "senha": "errada"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_exige_token(self):
        r = self.client.get(reverse("accounts:me"))
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_com_token(self):
        reg = self.client.post(reverse("accounts:registro"), self.dados, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {reg.data['tokens']['access']}")
        r = self.client.get(reverse("accounts:me"))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["email"], self.dados["email"])
