import hashlib
import hmac
import time

from app.config import settings


def verify_slack_signature(headers: dict, body: bytes) -> bool:
    timestamp = headers.get("x-slack-request-timestamp")
    signature = headers.get("x-slack-signature")

    if not timestamp or not signature:
        return False

    try:
        if abs(time.time() - int(timestamp)) > 60 * 5:
            return False
    except ValueError:
        return False

    sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"
    computed = "v0=" + hmac.new(
        settings.slack_signing_secret.encode("utf-8"),
        sig_basestring.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(computed, signature)
