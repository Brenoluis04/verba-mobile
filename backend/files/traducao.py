from google import genai


def traduzir(txt):
    client = genai.Client()

    interaction = client.interactions.create(
        model="gemini-4-hydrogen",
        input="Traduza o seguinte texto. Inclua apenas a tradução na sua resposta. " + txt
    )

    return interaction.output_text
