import logging
from datetime import date

from telegram import Update
from telegram.ext import ContextTypes

from app.bot.gemini import extract_from_document
from app.database import AsyncSessionLocal
from app.models import Transaction

logger = logging.getLogger(__name__)

SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}


def _format_amount(amount: float) -> str:
    return f"R$ {amount:_.2f}".replace(".", ",").replace("_", ".")


async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    doc = update.message.document
    mime_type = doc.mime_type or ""

    if mime_type not in SUPPORTED_MIME_TYPES:
        await update.message.reply_text(
            f"❌ Tipo de arquivo não suportado ({mime_type or 'desconhecido'}). "
            "Envie um PDF ou imagem (JPEG, PNG, WebP)."
        )
        return

    await update.message.reply_text("⏳ Processando documento...")

    file = await doc.get_file()
    file_bytes = bytes(await file.download_as_bytearray())

    try:
        data = await extract_from_document(file_bytes, mime_type)

        tx_date = date.today()
        if data.get("transaction_date"):
            tx_date = date.fromisoformat(data["transaction_date"])

        async with AsyncSessionLocal() as session:
            tx = Transaction(
                amount=data["amount"],
                merchant=data["merchant"],
                category=data["category"],
                transaction_date=tx_date,
                source="document",
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
        logger.exception("Erro ao processar documento (mime: %s)", mime_type)
        await update.message.reply_text(
            "❌ Não consegui processar o documento. "
            "Verifique se o arquivo contém um recibo legível."
        )
