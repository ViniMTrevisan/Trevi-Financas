from datetime import time
from zoneinfo import ZoneInfo

from telegram.ext import Application, CommandHandler, MessageHandler, filters

from app.bot.handlers.commands import (
    handle_categorias,
    handle_editar,
    handle_exportar,
    handle_hoje,
    handle_mes,
    handle_metas,
    handle_semana,
    handle_ultimas,
    send_weekly_summary,
)
from app.bot.handlers.document import handle_document
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
    app.add_handler(CommandHandler("semana", handle_semana, filters=owner))
    app.add_handler(CommandHandler("exportar", handle_exportar, filters=owner))
    app.add_handler(CommandHandler("metas", handle_metas, filters=owner))
    app.add_handler(CommandHandler("editar", handle_editar, filters=owner))

    app.add_handler(MessageHandler(owner & filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(owner & filters.Document.ALL, handle_document))
    app.add_handler(MessageHandler(owner & filters.TEXT & ~filters.COMMAND, handle_text))

    # Resumo semanal automático: todo domingo às 20h (horário de Brasília)
    app.job_queue.run_daily(
        send_weekly_summary,
        time=time(20, 0, tzinfo=ZoneInfo("America/Sao_Paulo")),
        days=(6,),
        data=settings.telegram_chat_id,
    )

    return app
