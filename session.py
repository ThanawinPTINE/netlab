"""
NETLab session tokens — stdlib-only HMAC-signed opaque tokens.

No JWT/itsdangerous dependency: the project has no requirements.txt and no
build tooling, so a token format is hand-rolled from hmac+hashlib instead of
adding a new pip dependency for something this small.

Token shape: base64url("<student_id>|<expiry_unix>") + "." + base64url(hmac_sha256)
Verification recomputes the HMAC over the same payload and compares with
hmac.compare_digest to avoid timing attacks, then checks the expiry.
"""

import base64
import hashlib
import hmac
import os
import time

TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60  # matches auth.js's AUTH_SESSION_DAYS = 7


def _secret_key() -> str:
    # Read lazily (not cached at import time): main.py does `import session`
    # before calling load_dotenv(), so a module-level os.getenv() here would
    # always see an empty string.
    return os.getenv("SECRET_KEY", "")


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64decode(data: str) -> bytes:
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def issue_token(student_id: str) -> str:
    secret = _secret_key()
    if not secret:
        raise RuntimeError("SECRET_KEY not set in .env — cannot issue session tokens")
    expiry = int(time.time()) + TOKEN_TTL_SECONDS
    payload = f"{student_id}|{expiry}".encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).digest()
    return f"{_b64encode(payload)}.{_b64encode(sig)}"


def verify_token(token: str):
    """Returns the student_id if the token is valid and unexpired, else None."""
    secret = _secret_key()
    if not secret or not token or "." not in token:
        return None
    try:
        payload_b64, sig_b64 = token.split(".", 1)
        payload = _b64decode(payload_b64)
        sig = _b64decode(sig_b64)
    except Exception:
        return None

    expected_sig = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).digest()
    if not hmac.compare_digest(sig, expected_sig):
        return None

    try:
        student_id, expiry_str = payload.decode("utf-8").split("|", 1)
        expiry = int(expiry_str)
    except Exception:
        return None

    if time.time() > expiry:
        return None
    return student_id
