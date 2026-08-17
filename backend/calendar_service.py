

import os
from datetime import datetime, timedelta

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.path.join(BASE_DIR, "credentials.json")
TOKEN_FILE = os.path.join(BASE_DIR, "token.json")
CODE_VERIFIER_FILE = os.path.join(BASE_DIR, ".google_code_verifier")

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


def get_google_flow(redirect_uri: str) -> Flow:
    """Create the Google OAuth flow used to connect a user's calendar."""
    flow = Flow.from_client_secrets_file(
        CREDENTIALS_FILE,
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )
    return flow


def get_authorization_url(redirect_uri: str):
    """Return the Google authorization URL and save the PKCE verifier."""
    flow = get_google_flow(redirect_uri)
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    if flow.code_verifier:
        with open(CODE_VERIFIER_FILE, "w", encoding="utf-8") as f:
            f.write(flow.code_verifier)

    return authorization_url, state


def save_google_token(authorization_response: str, redirect_uri: str):
    """Exchange Google's callback URL for credentials."""
    flow = get_google_flow(redirect_uri)

    if not os.path.exists(CODE_VERIFIER_FILE):
        raise RuntimeError(
            "Google OAuth verifier missing. Start again from /auth/google."
        )

    with open(CODE_VERIFIER_FILE, "r", encoding="utf-8") as f:
        flow.code_verifier = f.read().strip()

    flow.fetch_token(authorization_response=authorization_response)

    with open(TOKEN_FILE, "w", encoding="utf-8") as token:
        token.write(flow.credentials.to_json())

    try:
        os.remove(CODE_VERIFIER_FILE)
    except OSError:
        pass

    return flow.credentials


def get_calendar_credentials():
    """Load previously saved Google credentials."""
    if not os.path.exists(TOKEN_FILE):
        return None

    credentials = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    return credentials


def get_calendar_service():
    """Return an authenticated Google Calendar API service."""
    credentials = get_calendar_credentials()
    if not credentials or not credentials.valid:
        return None

    return build("calendar", "v3", credentials=credentials)


def create_calendar_event(
    summary: str,
    start_time: str,
    end_time: str | None = None,
    description: str = "",
    customer_email: str | None = None,
    timezone: str = "Asia/Kolkata",
):
    """Create an appointment in the connected Google Calendar.

    start_time and end_time must be ISO-8601 strings, e.g. 2026-08-20T15:00:00.
    If end_time is omitted, the appointment lasts 30 minutes.
    """
    service = get_calendar_service()
    if service is None:
        raise RuntimeError("Google Calendar is not connected. Open /auth/google first.")

    start = datetime.fromisoformat(start_time)
    if end_time:
        end = datetime.fromisoformat(end_time)
    else:
        end = start + timedelta(minutes=30)

    event = {
        "summary": summary,
        "description": description,
        "start": {
            "dateTime": start.isoformat(),
            "timeZone": timezone,
        },
        "end": {
            "dateTime": end.isoformat(),
            "timeZone": timezone,
        },
    }

    if customer_email:
        event["attendees"] = [{"email": customer_email}]

    return service.events().insert(
        calendarId="primary",
        body=event,
        sendUpdates="all" if customer_email else "none",
    ).execute()


def list_upcoming_events(max_results: int = 10):
    """Return upcoming events from the connected primary calendar."""
    service = get_calendar_service()
    if service is None:
        raise RuntimeError("Google Calendar is not connected. Open /auth/google first.")

    now = datetime.now().astimezone().isoformat()
    result = service.events().list(
        calendarId="primary",
        timeMin=now,
        maxResults=max_results,
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    return result.get("items", [])