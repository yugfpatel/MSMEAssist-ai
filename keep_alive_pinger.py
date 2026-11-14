#!/usr/bin/env python3
"""
ApisAI Standalone Keep-Alive Pinger
==================================
Runs an external heartbeat pinger to keep your backend permanently awake,
preventing free-tier sleep / inactivity spin-downs on Render, Koyeb, Railway, Fly.io, etc.

Usage:
    python keep_alive_pinger.py --url https://your-backend.onrender.com
    python keep_alive_pinger.py --url https://your-backend.onrender.com --interval 540
"""

import argparse
import os
import sys
import time
from datetime import datetime, timezone
import requests


def ping_target(target_url: str, timeout: int = 30) -> tuple[bool, int, str]:
    endpoint = f"{target_url.rstrip('/')}/health"
    try:
        resp = requests.get(
            endpoint,
            headers={
                "User-Agent": "ApisAI-StandalonePinger/1.0",
                "X-Keep-Alive": "external-cron",
            },
            timeout=timeout,
        )
        return (resp.status_code == 200, resp.status_code, resp.text[:120])
    except Exception as e:
        return (False, 0, str(e))


def main():
    parser = argparse.ArgumentParser(description="ApisAI 24/7 Backend Keep-Alive Pinger")
    parser.add_argument(
        "--url",
        default=os.getenv("BACKEND_URL") or os.getenv("RENDER_EXTERNAL_URL") or os.getenv("PUBLIC_BASE_URL"),
        help="Backend base URL to ping (e.g. https://your-app.onrender.com)",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=int(os.getenv("PING_INTERVAL", "540")),
        help="Interval in seconds between pings (default: 540 = 9 minutes)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Ping once and exit immediately (useful for crontab)",
    )

    args = parser.parse_args()

    if not args.url:
        print("Error: No target URL provided. Pass --url https://... or set BACKEND_URL in environment.")
        sys.exit(1)

    url = args.url.strip().rstrip("/")
    print("=" * 60)
    print(" ApisAI 24/7 Backend Keep-Alive Pinger")
    print(f" Target:   {url}/health")
    print(f" Interval: {args.interval}s ({(args.interval / 60):.1f} min)")
    print("=" * 60)

    count = 0
    while True:
        count += 1
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        ok, code, detail = ping_target(url)

        if ok:
            print(f"[{now}] Ping #{count}: SUCCESS (Status {code}) -> Server is LIVE.")
        else:
            print(f"[{now}] Ping #{count}: FAILED (Status {code}) -> {detail}")

        if args.once:
            sys.exit(0 if ok else 1)

        time.sleep(args.interval)


if __name__ == "__main__":
    main()
