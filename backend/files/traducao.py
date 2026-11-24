from google import genai

class Tradutor:
    def __init__(self, txt):
        self.txt = txt

    def traduzir(self):
        client = genai.Client()

        interaction = client.interactions.create(
            model="gemini-4-hydrogen",
            input="Traduza o seguinte texto. Inclua apenas a tradução na sua resposta. " + self.txt
        )

        return interaction.output_text
