import os
import requests
from dotenv import load_dotenv

load_dotenv()

ZAVU_API_KEY = os.getenv("ZAVU_API_KEY")
ZAVU_MESSAGES_URL = "https://api.zavu.dev/v1/messages"


def send_whatsapp_message(
    phone_number: str,
    message: str,
):
    """Send a WhatsApp text message through Zavu."""
    if not ZAVU_API_KEY:
        raise RuntimeError("ZAVU_API_KEY is missing from .env")

    payload = {
        "to": phone_number,
        "channel": "whatsapp",
        "text": message,
    }

    response = requests.post(
        ZAVU_MESSAGES_URL,
        json=payload,
        headers={
            "Authorization": f"Bearer {ZAVU_API_KEY}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )

    if not response.ok:
        raise RuntimeError(
            f"Zavu API error {response.status_code}: {response.text}"
        )

    return response.json()


def send_whatsapp_document(
    phone_number: str,
    document_url: str,
    filename: str = "invoice.pdf",
    caption: str = "Your invoice is ready.",
):
    """Send a PDF/document link through Zavu WhatsApp."""
    if not ZAVU_API_KEY:
        raise RuntimeError("ZAVU_API_KEY is missing from .env")

    payload = {
        "to": phone_number,
        "channel": "whatsapp",
        "messageType": "document",
        "content": {
            "mediaUrl": document_url,
            "caption": caption,
            "filename": filename,
        },
    }

    response = requests.post(
        ZAVU_MESSAGES_URL,
        json=payload,
        headers={
            "Authorization": f"Bearer {ZAVU_API_KEY}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )

    if not response.ok:
        raise RuntimeError(
            f"Zavu API error {response.status_code}: {response.text}"
        )

    return response.json()


def send_invoice_and_payment(
    phone_number: str,
    invoice_url: str,
    payment_link: str,
    total: float,
):
    """Send an invoice PDF link followed by its Razorpay payment link."""
    invoice_response = send_whatsapp_document(
        phone_number=phone_number,
        document_url=invoice_url,
        filename="invoice.pdf",
        caption=f"Invoice generated. Total: Rs. {total:.2f}",
    )

    payment_response = send_whatsapp_message(
        phone_number=phone_number,
        message=(
            f"💳 Payment for your invoice: Rs. {total:.2f}\n"
            f"Pay securely here: {payment_link}"
        ),
    )

    return {
        "invoice": invoice_response,
        "payment": payment_response,
    }