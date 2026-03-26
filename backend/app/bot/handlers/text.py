import logging
from datetime import date

from telegram import Update
from telegram.ext import ContextTypes

from app.bot.gemini import extract_from_text
from app.database import AsyncSessionLocal
from app.models import Transaction

logger = logging.getLogger(__name__)


def _format_amount(amount: float) -> str:
    return f"R$ {amount:_.2f}".replace(".", ",").replace("_", ".")


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_text = update.message.text.strip()

    try:
        data = await extract_from_text(user_text)

        async with AsyncSessionLocal() as session:
            tx = Transaction(
                amount=data["amount"],
                merchant=data["merchant"],
                category=data["category"],
                transaction_date=date.today(),
                source="text",
                raw_input=user_text,
                telegram_message_id=update.message.message_id,
            )
            session.add(tx)
            await session.commit()

        date_str = date.today().strftime("%d/%m")
        await update.message.reply_text(
            f"✅ {_format_amount(data['amount'])} — {data['merchant']} — {data['category']} — {date_str}"
        )

    except Exception:
        logger.exception("Erro ao processar mensagem de texto: %r", user_text)
        await update.message.reply_text(
            "❌ Não entendi. Tente algo como: \"gastei 47 no iFood\" ou \"uber 23 reais\"."
        )
