# Trevi Finanças

[![CI](https://github.com/ViniMTrevisan/Trevi-Financas/actions/workflows/ci.yml/badge.svg)](https://github.com/ViniMTrevisan/Trevi-Financas/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ViniMTrevisan/Trevi-Financas/graph/badge.svg)](https://codecov.io/gh/ViniMTrevisan/Trevi-Financas)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)

Sistema pessoal de controle financeiro via **Telegram bot** + **dashboard web**.

Registre gastos enviando uma foto de recibo ou uma mensagem de texto — o bot extrai os dados automaticamente com Google Gemini e salva no banco. O dashboard exibe totais, gráficos e permite editar tudo.

---

## Arquitetura

```
Telegram
   │  foto / texto livre
   ▼
FastAPI Bot  ──►  Google Gemini 2.5 Flash (OCR + NLP)
   │
   ▼
PostgreSQL  ◄──────────────────────────────────────────  Vite Dashboard
(Supabase)                                               React + Recharts
```

| Camada | Tecnologia |
|---|---|
| Backend / Bot | Python 3.11 · FastAPI · python-telegram-bot 21 |
| IA / OCR | Google Gemini 2.5 Flash (vision + texto) |
| Banco de dados | PostgreSQL 16 · SQLAlchemy async · asyncpg |
| Frontend | Vite · React 19 · TypeScript · Tailwind v4 · Recharts |
| Deploy backend | Railway   *Desligado |
| Deploy frontend | Vercel |
| Dev local | Docker + docker-compose |

---

## Funcionalidades

**Bot Telegram**
- Envia foto de recibo → Gemini extrai valor, estabelecimento, categoria e data
- Envia texto livre (`"gastei 35 reais no mercado"`) → mesmo processamento
- Suporte a PDFs e outros documentos
- Comandos: `/hoje`, `/mes`, `/ultimas`, `/categorias`, `/semana`, `/metas`, `/exportar`
- Acesso restrito por `TELEGRAM_CHAT_ID`

**Dashboard Web**
- Totais de hoje e do mês com variação em relação ao mês anterior
- Gráfico de barras por dia e pizza por categoria
- Ranking dos top 5 estabelecimentos
- Metas mensais por categoria com barra de progresso e CRUD inline
- Tabela de transações com edição inline, exclusão e criação manual
- Exportação para CSV
- Referência de todos os comandos do bot

---

## Screenshots

> 📸 Screenshots serão adicionados após o deploy.

---

## Estrutura do repositório

```
backend/
├── app/
│   ├── main.py           — FastAPI app + CORS + lifespan
│   ├── config.py         — variáveis de ambiente (pydantic-settings)
│   ├── database.py       — engine async + get_db dependency
│   ├── models.py         — Transaction, CategoryBudget (SQLAlchemy)
│   ├── schemas.py        — schemas Pydantic de entrada e saída
│   ├── routers/
│   │   ├── transactions.py  — CRUD + summaries + export CSV
│   │   └── budgets.py       — CRUD de metas por categoria
│   └── bot/
│       ├── application.py   — setup do bot (handlers + job queue)
│       ├── gemini.py        — integração Google Gemini
│       └── handlers/        — handlers de foto, texto, documento e comandos
├── tests/                — pytest + SQLite in-memory
├── Dockerfile
├── requirements.txt
└── pytest.ini

frontend/
├── src/
│   ├── App.tsx                  — 3 abas: Dashboard / Transações / Comandos
│   ├── api/client.ts            — wrapper de fetch para todos os endpoints
│   ├── types/transaction.ts     — tipos TypeScript
│   └── components/
│       ├── SummaryCards.tsx
│       ├── ExtraMetricsCards.tsx
│       ├── DailyChart.tsx
│       ├── CategoryChart.tsx
│       ├── TopMerchants.tsx
│       ├── BudgetProgress.tsx
│       ├── TransactionsTable.tsx
│       └── CommandsReference.tsx
└── ...

.github/
└── workflows/
    └── ci.yml            — testes + deploy (Railway + Vercel, comentado)
```

---

## Dev local

**Pré-requisitos:** Docker, Docker Compose

```bash
# 1. Copiar e preencher variáveis
cp .env.example .env

# 2. Subir banco + backend
make up          # ou: docker-compose up --build

# 3. Frontend (terminal separado)
make frontend-dev   # ou: cd frontend && npm install && npm run dev
```

Backend disponível em `http://localhost:8000` · Frontend em `http://localhost:5173`

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `TELEGRAM_TOKEN` | Token do bot (BotFather) |
| `TELEGRAM_CHAT_ID` | Chat ID do dono — restringe acesso |
| `GEMINI_API_KEY` | Google AI Studio |
| `DATABASE_URL` | Connection string PostgreSQL |
| `FRONTEND_URL` | URL do frontend em produção (para CORS) |

### Rodando os testes

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest tests/ -v   # ou simplesmente: make test
```

---

## Schema principal

```sql
-- transactions
id                  UUID PRIMARY KEY
amount              DECIMAL(10,2)
merchant            VARCHAR(255)
category            VARCHAR(50)   -- Alimentação | Mercado | Transporte | Saúde | Lazer | Serviços | Outro
transaction_date    DATE
source              VARCHAR(20)   -- 'photo' | 'text' | 'document' | 'manual'
raw_input           TEXT
telegram_message_id BIGINT
created_at          TIMESTAMP

-- category_budgets
id              UUID PRIMARY KEY
category        VARCHAR(50) UNIQUE
monthly_limit   DECIMAL(10,2)
created_at      TIMESTAMP
```
