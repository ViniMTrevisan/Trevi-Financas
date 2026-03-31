import csv
import io
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from telegram import InputFile, Update
from telegram.ext import ContextTypes

from app.bot.queries import (
    categories_month,
    categories_week,
    get_budgets,
    get_transactions_month,
    get_transaction_by_position,
    last_transactions,
    set_budget,
    total_month,
    total_today,
    total_week,
    update_transaction,
)
from app.database import AsyncSessionLocal
from app.models import InvestmentSnapshot

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


async def handle_semana(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    async with AsyncSessionLocal() as session:
        total = await total_week(session)
        rows = await categories_week(session)

    today = date.today()
    monday = today - timedelta(days=today.weekday())
    label = f"{monday.strftime('%d/%m')} — {today.strftime('%d/%m')}"

    if not rows:
        await update.message.reply_text(f"📊 Semana ({label}): nenhum gasto registrado.")
        return

    lines = [f"📊 Semana ({label}): {_fmt(total)}", ""]
    for category, subtotal in rows:
        lines.append(f"{category:<14} {_fmt(subtotal)}")
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


_VALID_CATEGORIES = {
    "Alimentação", "Mercado", "Transporte", "Saúde", "Lazer", "Serviços", "Outro"
}


def _progress_bar(pct: float, width: int = 10) -> str:
    filled = min(int(pct / 100 * width), width)
    return "█" * filled + "░" * (width - filled)


async def handle_metas(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args

    # /metas <Categoria> <valor> → define meta
    if args and len(args) >= 2:
        category = args[0].capitalize()
        # Ajuste para categorias acentuadas passadas sem acento
        for valid in _VALID_CATEGORIES:
            if valid.lower() == category.lower():
                category = valid
                break

        if category not in _VALID_CATEGORIES:
            await update.message.reply_text(
                f"Categoria inválida: {category}\nVálidas: {', '.join(sorted(_VALID_CATEGORIES))}"
            )
            return

        try:
            limit = float(args[1].replace(",", "."))
        except ValueError:
            await update.message.reply_text(f"Valor inválido: {args[1]}")
            return

        async with AsyncSessionLocal() as session:
            await set_budget(session, category, limit)
        await update.message.reply_text(f"✅ Meta de {category} definida: {_fmt(limit)}/mês")
        return

    # /metas → exibe progresso do mês atual
    async with AsyncSessionLocal() as session:
        budgets = await get_budgets(session)
        spending = await categories_month(session)

    spending_map = {cat: total for cat, total in spending}
    budgets_map = {b.category: float(b.monthly_limit) for b in budgets}

    all_categories = sorted(set(spending_map) | set(budgets_map))
    if not all_categories:
        await update.message.reply_text("📊 Nenhuma transação ou meta registrada.")
        return

    today = date.today()
    label = f"{_MONTHS[today.month]}/{today.year}"
    lines = [f"🎯 Metas — {label}", ""]

    for cat in all_categories:
        spent = spending_map.get(cat, 0.0)
        limit = budgets_map.get(cat)
        if limit:
            pct = min(spent / limit * 100, 100)
            bar = _progress_bar(pct)
            lines.append(f"{cat}")
            lines.append(f"  {_fmt(spent)} / {_fmt(limit)}  {bar}  {pct:.0f}%")
        else:
            lines.append(f"{cat}  {_fmt(spent)}  (sem meta)")

    await update.message.reply_text("\n".join(lines))


async def handle_exportar(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    today = date.today()
    year, month = today.year, today.month

    async with AsyncSessionLocal() as session:
        txs = await get_transactions_month(session, year, month)

    if not txs:
        await update.message.reply_text(f"📋 Nenhuma transação em {_MONTHS[month]}/{year} para exportar.")
        return

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Data", "Estabelecimento", "Categoria", "Valor", "Fonte"])
    for tx in txs:
        writer.writerow([
            tx.transaction_date.strftime("%d/%m/%Y"),
            tx.merchant,
            tx.category,
            f"{float(tx.amount):.2f}".replace(".", ","),
            tx.source,
        ])

    csv_bytes = buf.getvalue().encode("utf-8")
    filename = f"trevi-{year:04d}-{month:02d}.csv"
    await update.message.reply_document(
        document=InputFile(io.BytesIO(csv_bytes), filename=filename),
        caption=f"📊 {len(txs)} transações de {_MONTHS[month]}/{year}",
    )


async def handle_investimento(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args

    if not args:
        await update.message.reply_text(
            "💰 *Registro de investimento*\n\n"
            "Uso: `/investimento <valor> [observação]`\n\n"
            "Exemplos:\n"
            "`/investimento 13500`\n"
            "`/investimento 13850 Rendimento ótimo esse mês`",
            parse_mode="Markdown",
        )
        return

    try:
        amount = float(Decimal(args[0].replace(",", ".")))
    except InvalidOperation:
        await update.message.reply_text(f"Valor inválido: {args[0]}")
        return

    notes = " ".join(args[1:]) if len(args) > 1 else None
    today = date.today()

    async with AsyncSessionLocal() as session:
        existing = await session.execute(
            select(InvestmentSnapshot).where(InvestmentSnapshot.snapshot_date == today)
        )
        if existing.scalar_one_or_none():
            await update.message.reply_text(
                f"⚠️ Já existe um registro para hoje ({today.strftime('%d/%m/%Y')}).\n"
                "Use o dashboard para editar ou deletar."
            )
            return

        # Busca snapshot anterior para calcular crescimento
        prev_result = await session.execute(
            select(InvestmentSnapshot)
            .where(InvestmentSnapshot.snapshot_date < today)
            .order_by(InvestmentSnapshot.snapshot_date.desc())
        )
        prev = prev_result.scalar_one_or_none()

        import uuid as _uuid
        snapshot = InvestmentSnapshot(
            id=_uuid.uuid4(),
            amount=amount,
            notes=notes,
            snapshot_date=today,
        )
        session.add(snapshot)
        await session.commit()

    lines = [
        "✅ *Investimento registrado!*",
        f"📅 Data: {today.strftime('%d/%m/%Y')}",
        f"💰 Saldo: {_fmt(amount)}",
    ]

    if prev:
        prev_amount = float(prev.amount)
        diff = amount - prev_amount
        pct = (diff / prev_amount * 100) if prev_amount else 0
        sign = "+" if diff >= 0 else ""
        lines.append(f"📈 Crescimento: {sign}{_fmt(diff)} ({sign}{pct:.1f}%) vs período anterior")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def send_weekly_summary(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Job agendado: envia resumo semanal todo domingo às 20h."""
    chat_id: int = context.job.data

    async with AsyncSessionLocal() as session:
        total = await total_week(session)
        rows = await categories_week(session)

    today = date.today()
    monday = today - timedelta(days=today.weekday())
    label = f"{monday.strftime('%d/%m')} — {today.strftime('%d/%m')}"

    if not rows:
        text = f"📊 Semana ({label}): nenhum gasto registrado."
    else:
        lines = [f"📊 Resumo da semana ({label}): {_fmt(total)}", ""]
        for category, subtotal in rows:
            lines.append(f"{category:<14} {_fmt(subtotal)}")
        text = "\n".join(lines)

    await context.bot.send_message(chat_id=chat_id, text=text)
