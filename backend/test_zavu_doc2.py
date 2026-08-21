import os
import requests
from dotenv import load_dotenv

load_dotenv()
ZAVU_API_KEY = os.getenv("ZAVU_API_KEY")
ZAVU_MESSAGES_URL = "https://api.zavu.dev/v1/messages"

def test_payload(payload, name):
    print(f"\n--- {name} ---")
    resp = requests.post(
        ZAVU_MESSAGES_URL,
        json=payload,
        headers={"Authorization": f"Bearer {ZAVU_API_KEY}", "Content-Type": "application/json"},
    )
    print("STATUS:", resp.status_code)
    print("RESPONSE:", resp.text)

test_payload({
    "to": "919999999999",
    "channel": "whatsapp",
    "type": "document",
    "content": "https://example.com/invoice.pdf"
}, "content string url")

test_payload({
    "to": "919999999999",
    "channel": "whatsapp",
    "message_type": "document",
    "content": {
        "url": "https://example.com/invoice.pdf"
    }
}, "message_type document content object")

test_payload({
    "to": "919999999999",
    "channel": "whatsapp",
    "document": {
        "url": "https://example.com/invoice.pdf",
        "filename": "invoice.pdf"
    },
    "text": "caption?"
}, "document + text")

test_payload({
    "to": "919999999999",
    "channel": "whatsapp",
    "content": "https://example.com/invoice.pdf",
    "type": "image"
}, "content + image")

test_payload({
    "to": "919999999999",
    "channel": "whatsapp",
    "type": "document",
    "document": {
        "url": "https://example.com/invoice.pdf",
        "filename": "invoice.pdf"
    },
    "content": "fallback text"
}, "document + content string")
