# 🚀 Verba — Plataforma Mobile de Tradução, Resumos e Aprendizado Inteligente

> **Cadeira:** Códigos de Alta Performance - Mobile  

---

## 📌 Sobre o Projeto

O **Verba** é um aplicativo mobile focado na gestão, leitura e tradução inteligente de documentos acadêmicos, livros, HQs e mangás. O objetivo principal do projeto é aplicar técnicas avançadas e boas práticas de **alta performance mobile**, garantindo renderização otimizada no cliente, gerenciamento eficiente de memória e rotinas assíncronas no backend.

### 💡 Principais Funcionalidades
- **Tradutor Contextual com IA:** Tradução de documentos e páginas de mangás/HQs preservando os balões de diálogo e caixas de texto.
- **Resumidor Instantâneo:** Geração de resumos executivos e sínteses por tópicos a partir de PDFs e livros.
- **Minha Biblioteca:** Armazenamento local e em nuvem com acompanhamento de progresso de leitura.
- **Trilhas de Aprendizado:** Gerador de roteiros de estudos ("Do Zero ao Avançado") com orquestração de mídias e cronogramas.
  
---

## ▶️ Como rodar

Pré-requisitos: **Python 3.12+** e **Node.js** instalados. Use dois terminais, ambos na pasta raiz do projeto.

### Back-end (Django, porta 8000)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
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
- Os documentos enviados ficam em `backend/media/` (ignorada pelo git). Aceita PDF e imagens (JPG, PNG, GIF, WEBP) de até 20 MB.
- O banco local é o `backend/db.sqlite3` (ignorado pelo git). Cada pessoa tem o seu.
