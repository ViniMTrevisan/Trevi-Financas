# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Produto

Trevi Finanças — sistema pessoal de controle financeiro via Telegram bot + dashboard web. Usuário único: Vinicius Meier Trevisan. PRD completo em `docs/Trevi Financas - PRD.docx`.

Nota: Vamos fazer por partes, quero que seja bem divido o projeto. Devemos estruturar o projeto da melhor forma possivel. Eu NAO quero commitar tudo junto ao final, quero commits separados ao longo do projeto.

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Backend / Bot | Python + FastAPI + python-telegram-bot |
| IA / OCR | Google Gemini 1.5 Flash (vision + texto livre) |
| Banco de Dados | PostgreSQL via Supabase (asyncpg) |
| Frontend | Vite |
| Deploy Backend | Railway |
| Deploy Frontend | Vercel |
| Dev local | Docker + docker-compose |

## Arquitetura

```
Telegram → FastAPI Bot → Gemini Flash Vision → PostgreSQL ← Vite Dashboard
```

- O bot recebe **fotos de recibos** ou **mensagens em texto livre**, processa via Gemini e salva no banco
- O dashboard Vite consome a mesma base de dados para visualização
- Segurança básica: bot rejeita qualquer mensagem fora do `TELEGRAM_CHAT_ID` configurado

## Estrutura do Repositório

```
backend/    # Python + FastAPI + bot
frontend/   # Vite dashboard
docs/       # PRD e documentação
```

## Variáveis de Ambiente

Todas as credenciais via `.env` (nunca commitado). Para dev local, usar docker-compose com `.env` local.

| Variável | Descrição |
|---|---|
| `TELEGRAM_TOKEN` | Token do bot (BotFather) |
| `TELEGRAM_CHAT_ID` | Chat ID do dono (restrição de acesso) |
| `GEMINI_API_KEY` | Google AI Studio |
| `DATABASE_URL` | Connection string PostgreSQL (Supabase em prod, Docker em dev) |

## Schema Principal

Tabela `transactions`:

```sql
id                  UUID PRIMARY KEY
amount              DECIMAL(10,2)      -- valor em R$
merchant            VARCHAR(255)
category            VARCHAR(50)        -- Alimentação | Mercado | Transporte | Saúde | Lazer | Serviços | Outro
transaction_date    DATE
source              VARCHAR(20)        -- 'photo' | 'text'
raw_input           TEXT               -- resposta bruta do Gemini
telegram_message_id BIGINT
created_at          TIMESTAMP
```

## Comandos do Bot

`/hoje`, `/mes`, `/ultimas`, `/categorias`, `/editar [id]`

## Roadmap

- **Fase 1** — Bot funcional: OCR de recibos, entrada por texto, deploy Railway
- **Fase 2** — Dashboard Vite: totais, gráficos por categoria e por dia, tabela com filtros
- **Fase 3** — Refinamentos: comandos utilitários, /editar, resumo semanal
- **Fase 4** — Backlog: Open Finance (Pluggy), metas por categoria, exportação CSV

## Dev Local

Usar Docker + docker-compose. Garantir que `DATABASE_URL` no `.env` aponte para o container PostgreSQL local, não para o Supabase de produção.
