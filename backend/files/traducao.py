"""Tradução de texto com o Gemini (plano gratuito).

Só este arquivo conversa com a IA. As views chamam `Tradutor(texto).traduzir()` e
tratam `TraducaoErro`; nos testes basta simular `Tradutor._chamar_gemini`.
"""

import re

from django.conf import settings

# Tamanho (em caracteres) de cada parte enviada ao Gemini.
TAMANHO_PARTE = 6000
# Acima disso o texto é recusado, para não gastar o limite diário do plano gratuito.
MAX_CARACTERES = 60000

PROMPT = (
    "Traduza o texto abaixo para o português do Brasil. "
    "Mantenha a divisão em parágrafos. "
    "Responda apenas com a tradução, sem comentários, títulos ou explicações.\n\n"
)


class TraducaoErro(Exception):
    """Erro já com mensagem amigável e o status HTTP que a view deve devolver."""

    def __init__(self, mensagem, status=502):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status = status


def dividir_texto(texto, tamanho=TAMANHO_PARTE):
    """Divide o texto em partes de até `tamanho` caracteres, sem cortar parágrafos
    (e, se um parágrafo for maior que o limite, sem cortar frases quando possível)."""
    partes, atual = [], ""

    def guardar():
        nonlocal atual
        if atual.strip():
            partes.append(atual.strip())
        atual = ""

    for paragrafo in re.split(r"\n\s*\n", texto.strip()):
        paragrafo = paragrafo.strip()
        if not paragrafo:
            continue
        # Parágrafo gigante: quebra por frases e, em último caso, no tamanho fixo.
        if len(paragrafo) > tamanho:
            guardar()
            for frase in re.split(r"(?<=[.!?])\s+", paragrafo):
                while len(frase) > tamanho:
                    if len(atual) + len(frase) > tamanho and atual:
                        guardar()
                    partes.append(frase[:tamanho])
                    frase = frase[tamanho:]
                if len(atual) + len(frase) + 1 > tamanho:
                    guardar()
                atual = f"{atual} {frase}".strip()
            guardar()
            continue
        if len(atual) + len(paragrafo) + 2 > tamanho:
            guardar()
        atual = f"{atual}\n\n{paragrafo}" if atual else paragrafo
    guardar()
    return partes


class Tradutor:
    def __init__(self, txt):
        self.txt = txt or ""

    def traduzir(self):
        """Devolve o texto traduzido ou lança TraducaoErro."""
        if not self.txt.strip():
            raise TraducaoErro("Não há texto para traduzir.", status=422)
        if len(self.txt) > MAX_CARACTERES:
            raise TraducaoErro(
                f"O texto é grande demais para traduzir de uma vez "
                f"(limite de {MAX_CARACTERES:,} caracteres).".replace(",", "."),
                status=422,
            )
        if not getattr(settings, "GEMINI_API_KEY", ""):
            raise TraducaoErro(
                "A tradução com IA não está configurada: falta a chave GEMINI_API_KEY no arquivo .env.",
                status=503,
            )

        traduzidas = [self._chamar_gemini(parte) for parte in dividir_texto(self.txt)]
        return "\n\n".join(traduzidas)

    def _chamar_gemini(self, trecho):
        """Traduz um trecho. É a única função que fala com a internet."""
        # Import aqui dentro: o resto do projeto (e os testes) funciona mesmo sem a biblioteca.
        try:
            from google import genai
            from google.genai import errors
        except ImportError:
            raise TraducaoErro(
                "A biblioteca google-genai não está instalada (pip install -r requirements.txt).",
                status=503,
            )

        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            resposta = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=PROMPT + trecho,
            )
        except errors.APIError as e:
            codigo = getattr(e, "code", None)
            if codigo == 429:
                raise TraducaoErro(
                    "O limite diário de traduções com IA acabou. Tente novamente mais tarde.",
                    status=429,
                )
            if codigo in (400, 401, 403):
                raise TraducaoErro(
                    "A chave do Gemini foi recusada. Confira a GEMINI_API_KEY no arquivo .env.",
                    status=503,
                )
            raise TraducaoErro("O serviço de tradução está com problemas. Tente novamente.", status=502)
        except Exception:
            # Sem internet, DNS, timeout etc.
            raise TraducaoErro(
                "Não foi possível conectar ao serviço de tradução. Verifique a internet do servidor.",
                status=503,
            )

        texto = (getattr(resposta, "text", None) or "").strip()
        if not texto:
            raise TraducaoErro("A IA devolveu uma resposta vazia. Tente novamente.", status=502)
        return texto
