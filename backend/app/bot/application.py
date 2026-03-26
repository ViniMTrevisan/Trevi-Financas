from telegram.ext import Application, CommandHandler, MessageHandler, filters

from app.bot.handlers.commands import (
    handle_categorias,
    handle_editar,
    handle_hoje,
    handle_mes,
    handle_ultimas,
)
from app.bot.handlers.photo import handle_photo
from app.bot.handlers.text import handle_text
from app.config import get_settings


def build_application() -> Application:
    settings = get_settings()

    app = Application.builder().token(settings.telegram_token).build()

    owner = filters.Chat(chat_id=settings.telegram_chat_id)

    app.add_handler(CommandHandler("hoje", handle_hoje, filters=owner))
    app.add_handler(CommandHandler("mes", handle_mes, filters=owner))
    app.add_handler(CommandHandler("ultimas", handle_ultimas, filters=owner))
    app.add_handler(CommandHandler("categorias", handle_categorias, filters=owner))
    app.add_handler(CommandHandler("editar", handle_editar, filters=owner))

    app.add_handler(MessageHandler(owner & filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(owner & filters.TEXT & ~filters.COMMAND, handle_text))

    return app
