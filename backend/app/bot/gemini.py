import json
import logging
import re

from google import genai
from google.genai import types

from app.config import get_settings

logger = logging.getLogger(__name__)

CATEGORIES = "Alimentação, Mercado, Transporte, Saúde, Lazer, Serviços, Outro"
MODEL = "gemini-2.5-flash"
_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=get_settings().gemini_api_key)
    return _client


def _parse_json(text: str) -> dict:
    text = re.sub(r"```(?:json)?\n?", "", text).strip().rstrip("`")
    return json.loads(text)


async def extract_from_photo(image_bytes: bytes) -> dict:
    prompt = f"""Analise esta foto de recibo ou comprovante de pagamento.
Responda APENAS com JSON válido, sem texto adicional:

{{
  "amount": <valor total em reais como número, ex: 47.90>,
  "merchant": "<nome do estabelecimento>",
  "transaction_date": "<data no formato YYYY-MM-DD, ou null se não visível>",
  "category": "<uma de: {CATEGORIES}>"
}}"""

    response = await get_client().aio.models.generate_content(
        model=MODEL,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            prompt,
        ],
    )
    logger.info("Gemini raw response (photo): %r", response.text)
    return _parse_json(response.text)


async def extract_from_text(text: str) -> dict:
    prompt = f"""O usuário registrou um gasto pessoal em linguagem natural.
Mensagem: "{text}"

Responda APENAS com JSON válido, sem texto adicional:

{{
  "amount": <valor em reais como número, ex: 47.90>,
  "merchant": "<nome do estabelecimento ou serviço>",
  "category": "<uma de: {CATEGORIES}>"
}}"""

    response = await get_client().aio.models.generate_content(
        model=MODEL,
        contents=prompt,
    )
    logger.info("Gemini raw response (text): %r", response.text)
    return _parse_json(response.text)
