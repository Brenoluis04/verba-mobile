# 🚀 Verba — Plataforma Mobile de Tradução, Resumos e Aprendizado Inteligente

> **Cadeira:** Códigos de Alta Performance - Mobile  

---

## 📌 Sobre o Projeto

O **Verba** é um aplicativo mobile focado na gestão, leitura e tradução inteligente de documentos acadêmicos, livros, HQs e mangás. O objetivo principal do projeto é aplicar técnicas avançadas e boas práticas de **alta performance mobile**, garantindo renderização otimizada no cliente, gerenciamento eficiente de memória e rotinas assíncronas no backend.

### 💡 Principais Funcionalidades
- **Tradutor com IA (Gemini):** Lê o texto de um PDF da biblioteca e traduz para português, em partes quando o texto é longo.
- **Resumidor Instantâneo:** Geração de resumos executivos e sínteses por tópicos a partir de PDFs e livros.
- **Minha Biblioteca:** Armazenamento local e em nuvem com acompanhamento de progresso de leitura.
  
---

## ▶️ Como rodar

Pré-requisitos: **Python 3.12+** e **Node.js** instalados. Use dois terminais, ambos na pasta raiz do projeto.

### Back-end (Django, porta 8000)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env      # depois abra o .env e cole a sua chave do Gemini
python manage.py migrate
python manage.py runserver
```
> **Chave do Gemini:** crie uma em https://aistudio.google.com/apikey (plano gratuito) e coloque em `backend/.env` como `GEMINI_API_KEY=...`. O `.env` não vai para o git. Sem a chave tudo funciona, menos o botão **Traduzir com IA**, que mostra um aviso.
> Depois de **puxar código novo**, rode `python manage.py migrate` de novo (pode haver migrations novas).
> Para rodar os testes: `python manage.py test`

### Front-end (React + Vite, porta 5173)
```powershell
cd frontend
npm install
npm run dev
```
Abra o endereço mostrado pelo Vite (normalmente http://localhost:5173). A URL da API é `http://localhost:8000/api`; para mudar, copie `frontend/.env.example` para `frontend/.env`.

### Observações
- Os documentos enviados ficam em `backend/media/` (ignorada pelo git). Aceita **somente PDF**, de até **50 MB**.
- O banco local é o `backend/db.sqlite3` (ignorado pelo git). Cada pessoa tem o seu.
