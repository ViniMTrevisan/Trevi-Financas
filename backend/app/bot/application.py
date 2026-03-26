from telegram.ext import Application, MessageHandler, filters

from app.bot.handlers.photo import handle_photo
from app.bot.handlers.text import handle_text
from app.config import get_settings


def build_application() -> Application:
    settings = get_settings()

    app = Application.builder().token(settings.telegram_token).build()

    owner = filters.Chat(chat_id=settings.telegram_chat_id)

    app.add_handler(MessageHandler(owner & filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(owner & filters.TEXT & ~filters.COMMAND, handle_text))

    return app
