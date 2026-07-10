import re

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.search.gemini_client import run_inventory_search
from app.slack.signature import verify_slack_signature

router = APIRouter()

MENTION_RE = re.compile(r"<@[A-Z0-9]+>")


@router.post("/slack/events")
async def slack_events(request: Request, db: Session = Depends(get_db)):
    body = await request.body()

    if not verify_slack_signature(request.headers, body):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Slack signature")

    payload = await request.json()

    if payload.get("type") == "url_verification":
        return {"challenge": payload.get("challenge")}

    event = payload.get("event", {})

    if event.get("type") == "app_mention":
        text = MENTION_RE.sub("", event.get("text", "")).strip()
        channel = event.get("channel")
        thread_ts = event.get("thread_ts") or event.get("ts")

        result = run_inventory_search(text, db)

        async with httpx.AsyncClient() as client:
            await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {settings.slack_bot_token}"},
                json={
                    "channel": channel,
                    "thread_ts": thread_ts,
                    "text": result["answer"],
                },
            )

    return {"ok": True}
