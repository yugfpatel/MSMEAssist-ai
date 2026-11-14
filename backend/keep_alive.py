import asyncio
import logging
import os
import time
from datetime import datetime, timezone
import httpx

logger = logging.getLogger("apisai.keepalive")

# Process telemetry
START_TIME = time.time()
LAST_PING_AT: str | None = None
LAST_PING_STATUS: int | None = None
PING_COUNT: int = 0
SELF_PING_TASK: asyncio.Task | None = None


def get_public_url() -> str | None:
    """
    Detect the external public URL of this deployment.
    Render automatically injects RENDER_EXTERNAL_URL into web services.
    Other platforms or manual configurations can set BACKEND_URL, PUBLIC_BASE_URL, or SELF_URL.
    """
    candidates = [
        os.getenv("RENDER_EXTERNAL_URL"),
        os.getenv("BACKEND_URL"),
        os.getenv("PUBLIC_BASE_URL"),
        os.getenv("SELF_URL"),
    ]
    for url in candidates:
        if url and url.strip():
            cleaned = url.strip().rstrip("/")
            # Avoid self-pinging localhost in development
            if not cleaned.startswith("http://localhost") and not cleaned.startswith("http://127.0.0.1"):
                return cleaned
    return None


async def start_self_pinger(interval_seconds: int = 540):
    """
    Background loop that pings the application's public /health endpoint
    every `interval_seconds` (default: 9 minutes / 540 seconds).
    Render's free tier sleeps after 15 minutes of inactivity; 9 minutes ensures
    the service stays permanently warm, awake, and active 24/7/365.
    """
    global LAST_PING_AT, LAST_PING_STATUS, PING_COUNT
    public_url = get_public_url()

    if not public_url:
        logger.info(
            "[KeepAlive] No public URL configured (RENDER_EXTERNAL_URL/BACKEND_URL). "
            "Self-pinger will remain idle in local development."
        )
        return

    health_url = f"{public_url}/health"
    logger.info("[KeepAlive] Self-pinger activated for %s (interval: %ss)", health_url, interval_seconds)

    # Initial grace period on startup so the server is fully bound and ready
    await asyncio.sleep(45)

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            try:
                resp = await client.get(
                    health_url,
                    headers={
                        "User-Agent": "ApisAI-KeepAlive/1.0",
                        "X-Keep-Alive": "self-pinger",
                    },
                )
                LAST_PING_AT = datetime.now(timezone.utc).isoformat()
                LAST_PING_STATUS = resp.status_code
                PING_COUNT += 1
                logger.info(
                    "[KeepAlive] Ping #%d to %s -> Status %d",
                    PING_COUNT,
                    health_url,
                    resp.status_code,
                )
            except Exception as e:
                LAST_PING_AT = datetime.now(timezone.utc).isoformat()
                LAST_PING_STATUS = 0
                logger.warning("[KeepAlive] Ping to %s failed: %s", health_url, e)

            await asyncio.sleep(interval_seconds)


def get_keepalive_stats() -> dict:
    uptime_seconds = int(time.time() - START_TIME)
    hours = uptime_seconds // 3600
    minutes = (uptime_seconds % 3600) // 60
    seconds = uptime_seconds % 60
    return {
        "status": "online",
        "service": "apisai-backend",
        "uptime_seconds": uptime_seconds,
        "uptime_human": f"{hours}h {minutes}m {seconds}s",
        "public_url": get_public_url(),
        "self_ping_active": get_public_url() is not None,
        "last_ping_at": LAST_PING_AT,
        "last_ping_status": LAST_PING_STATUS,
        "total_pings_sent": PING_COUNT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
