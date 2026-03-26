from datetime import date

from telegram import Update
from telegram.ext import ContextTypes

from app.bot.gemini import extract_from_photo
from app.database import AsyncSessionLocal
from app.models import Transaction


def _format_amount(amount: float) -> str:
    return f"R$ {amount:_.2f}".replace(".", ",").replace("_", ".")


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("⏳ Processando recibo...")

    photo = update.message.photo[-1]
    file = await photo.get_file()
    image_bytes = bytes(await file.download_as_bytearray())

    try:
        data = await extract_from_photo(image_bytes)

        tx_date = date.today()
        if data.get("transaction_date"):
            tx_date = date.fromisoformat(data["transaction_date"])

        async with AsyncSessionLocal() as session:
            tx = Transaction(
                amount=data["amount"],
                merchant=data["merchant"],
                category=data["category"],
                transaction_date=tx_date,
                source="photo",
                raw_input=str(data),
                telegram_message_id=update.message.message_id,
            )
            session.add(tx)
            await session.commit()

        date_str = tx_date.strftime("%d/%m")
        await update.message.reply_text(
            f"✅ {_format_amount(data['amount'])} — {data['merchant']} — {data['category']} — {date_str}"
        )

    except Exception:
        await update.message.reply_text(
            "❌ Não consegui processar o recibo. Tente reenviar com melhor iluminação ou use texto livre."
        )
