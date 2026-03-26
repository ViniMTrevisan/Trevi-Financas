from datetime import date
from decimal import Decimal, InvalidOperation

from telegram import Update
from telegram.ext import ContextTypes

from app.bot.queries import (
    categories_month,
    get_transaction_by_position,
    last_transactions,
    total_month,
    total_today,
    update_transaction,
)
from app.database import AsyncSessionLocal

_MONTHS = [
    "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]


def _fmt(amount: float) -> str:
    return f"R$ {amount:_.2f}".replace(".", ",").replace("_", ".")


async def handle_hoje(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with AsyncSessionLocal() as session:
        total = await total_today(session)

    today = date.today()
    if total == 0:
        await update.message.reply_text(f"📊 Hoje ({today.strftime('%d/%m')}): nenhum gasto registrado.")
    else:
        await update.message.reply_text(f"📊 Hoje ({today.strftime('%d/%m')}): {_fmt(total)}")


async def handle_mes(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with AsyncSessionLocal() as session:
        total = await total_month(session)

    today = date.today()
    label = f"{_MONTHS[today.month]}/{today.year}"
    if total == 0:
        await update.message.reply_text(f"📊 {label}: nenhum gasto registrado.")
    else:
        await update.message.reply_text(f"📊 {label}: {_fmt(total)}")


async def handle_ultimas(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with AsyncSessionLocal() as session:
        txs = await last_transactions(session)

    if not txs:
        await update.message.reply_text("📋 Nenhuma transação registrada ainda.")
        return

    lines = ["📋 Últimas transações:"]
    for i, tx in enumerate(txs, 1):
        lines.append(
            f"{i}. {tx.transaction_date.strftime('%d/%m')} — {tx.merchant} — {_fmt(float(tx.amount))} — {tx.category}"
        )
    await update.message.reply_text("\n".join(lines))


async def handle_categorias(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with AsyncSessionLocal() as session:
        rows = await categories_month(session)

    today = date.today()
    label = f"{_MONTHS[today.month]}/{today.year}"

    if not rows:
        await update.message.reply_text(f"📊 {label}: nenhum gasto registrado.")
        return

    lines = [f"📊 {label} por categoria:"]
    for category, total in rows:
        lines.append(f"{category:<14} {_fmt(total)}")
    await update.message.reply_text("\n".join(lines))


async def handle_editar(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args  # lista de palavras após o comando

    # /editar sem argumentos → exibe últimas com instruções
    if not args:
        async with AsyncSessionLocal() as session:
            txs = await last_transactions(session)

        if not txs:
            await update.message.reply_text("Nenhuma transação para editar.")
            return

        lines = ["📋 Últimas transações (use o número para editar):", ""]
        for i, tx in enumerate(txs, 1):
            lines.append(
                f"{i}. {tx.transaction_date.strftime('%d/%m')} — {tx.merchant} — {_fmt(float(tx.amount))} — {tx.category}"
            )
        lines += [
            "",
            "Exemplos:",
            "/editar 1 valor 35.90",
            "/editar 1 categoria Lazer",
            "/editar 1 local Restaurante X",
        ]
        await update.message.reply_text("\n".join(lines))
        return

    # /editar <n> <campo> <valor>
    if len(args) < 3:
        await update.message.reply_text(
            "Uso: /editar <número> <campo> <novo valor>\n"
            "Campos: valor, categoria, local\n"
            "Exemplo: /editar 1 valor 35.90"
        )
        return

    pos_str, field, *value_parts = args
    value = " ".join(value_parts)

    try:
        pos = int(pos_str)
    except ValueError:
        await update.message.reply_text("O primeiro argumento deve ser o número da transação (1–5).")
        return

    async with AsyncSessionLocal() as session:
        tx = await get_transaction_by_position(session, pos)

        if tx is None:
            await update.message.reply_text(f"Transação #{pos} não encontrada. Use /ultimas para ver a lista.")
            return

        if field == "valor":
            try:
                new_amount = float(Decimal(value.replace(",", ".")))
            except InvalidOperation:
                await update.message.reply_text(f"Valor inválido: {value}")
                return
            await update_transaction(session, tx.id, amount=new_amount)
            await update.message.reply_text(f"✅ Transação #{pos} atualizada: valor → {_fmt(new_amount)}")

        elif field == "categoria":
            await update_transaction(session, tx.id, category=value)
            await update.message.reply_text(f"✅ Transação #{pos} atualizada: categoria → {value}")

        elif field == "local":
            await update_transaction(session, tx.id, merchant=value)
            await update.message.reply_text(f"✅ Transação #{pos} atualizada: local → {value}")

        else:
            await update.message.reply_text(
                f"Campo desconhecido: '{field}'. Use: valor, categoria ou local."
            )
