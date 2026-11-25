import json
import logging
import os
import socket
from dataclasses import dataclass
from typing import Any

import firebase_admin
from firebase_admin import auth as fb_auth
from firebase_admin import credentials, firestore
from google.auth.credentials import AnonymousCredentials
from google.auth.transport import requests as google_requests
from google.cloud import firestore as gcp_firestore
from google.oauth2 import id_token as google_id_token

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

_cached_firestore_client: Any = None
_firestore_checked: bool = False
_google_transport_request = google_requests.Request()


class FirebaseAuthError(Exception):
    """Raised when Firebase ID token verification fails."""

    def __init__(self, message: str, status_code: int = 401, code: str = "invalid_token"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


@dataclass
class DecodedFirebaseToken:
    uid: str
    email: str | None
    email_verified: bool
    display_name: str | None
    role: str
    claims: dict[str, Any]


def _configure_emulator_env(settings: Settings) -> None:
    if settings.firebase_auth_emulator_host:
        os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = settings.firebase_auth_emulator_host
    else:
        os.environ.pop("FIREBASE_AUTH_EMULATOR_HOST", None)
    if settings.firestore_emulator_host:
        os.environ["FIRESTORE_EMULATOR_HOST"] = settings.firestore_emulator_host
    else:
        os.environ.pop("FIRESTORE_EMULATOR_HOST", None)


def _has_explicit_credentials(cfg: Settings) -> bool:
    if cfg.firebase_service_account_json:
        return True
    gac_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    return bool(gac_path and os.path.exists(gac_path))


def get_firebase_app(settings: Settings | None = None) -> firebase_admin.App:
    """Initialize and return the singleton Firebase Admin app without exposing secrets."""
    cfg = settings or get_settings()
    _configure_emulator_env(cfg)

    try:
        return firebase_admin.get_app()
    except ValueError:
        pass

    options = {"projectId": cfg.firebase_project_id}

    if cfg.firebase_service_account_json:
        try:
            service_account_info = json.loads(cfg.firebase_service_account_json)
            cred = credentials.Certificate(service_account_info)
            return firebase_admin.initialize_app(cred, options=options)
        except Exception as exc:
            logger.error(
                "Failed to initialize Firebase with inline service account JSON: %s",
                type(exc).__name__,
            )
            raise

    gac_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if gac_path and os.path.exists(gac_path):
        cred = credentials.Certificate(gac_path)
        return firebase_admin.initialize_app(cred, options=options)

    return firebase_admin.initialize_app(options=options)


def _emulator_reachable(host_port: str) -> bool:
    try:
        host, port_str = host_port.rsplit(":", 1)
        with socket.create_connection((host, int(port_str)), timeout=0.3):
            return True
    except Exception:
        return False


def get_firestore_client(settings: Settings | None = None):
    """Return a Firestore client if configured or running in emulator mode, else None."""
    global _cached_firestore_client, _firestore_checked
    cfg = settings or get_settings()
    _configure_emulator_env(cfg)

    emulator_host = os.getenv("FIRESTORE_EMULATOR_HOST") or cfg.firestore_emulator_host
    if emulator_host and not _has_explicit_credentials(cfg):
        if not _emulator_reachable(emulator_host):
            return None
        if _cached_firestore_client is None:
            _cached_firestore_client = gcp_firestore.Client(
                project=cfg.firebase_project_id,
                credentials=AnonymousCredentials(),
            )
        return _cached_firestore_client

    if not _has_explicit_credentials(cfg):
        return None

    if _firestore_checked:
        return _cached_firestore_client

    try:
        app = get_firebase_app(cfg)
        _cached_firestore_client = firestore.client(app=app)
        _firestore_checked = True
        return _cached_firestore_client
    except Exception as exc:
        _firestore_checked = True
        logger.warning("Firestore client unavailable: %s", type(exc).__name__)
        return None


def verify_firebase_id_token(
    id_token: str, settings: Settings | None = None
) -> DecodedFirebaseToken:
    """Verify a Firebase ID token and extract verified UID, email, and claims."""
    cfg = settings or get_settings()
    _configure_emulator_env(cfg)

    emulator_auth = os.getenv("FIREBASE_AUTH_EMULATOR_HOST") or cfg.firebase_auth_emulator_host
    use_admin_sdk = bool(emulator_auth) or _has_explicit_credentials(cfg)

    if use_admin_sdk:
        app = get_firebase_app(cfg)
        try:
            decoded = fb_auth.verify_id_token(
                id_token, app=app, check_revoked=cfg.firebase_check_revoked
            )
        except fb_auth.ExpiredIdTokenError as exc:
            raise FirebaseAuthError(
                "Authentication token has expired. Please sign in again.",
                status_code=401,
                code="token_expired",
            ) from exc
        except fb_auth.RevokedIdTokenError as exc:
            raise FirebaseAuthError(
                "Authentication session has been revoked. Please sign in again.",
                status_code=401,
                code="token_revoked",
            ) from exc
        except fb_auth.UserDisabledError as exc:
            raise FirebaseAuthError(
                "This account has been disabled.",
                status_code=403,
                code="account_disabled",
            ) from exc
        except fb_auth.InvalidIdTokenError as exc:
            raise FirebaseAuthError(
                "Invalid authentication token.",
                status_code=401,
                code="invalid_token",
            ) from exc
        except Exception as exc:
            logger.error("Unexpected Firebase token verification error: %s", type(exc).__name__)
            raise FirebaseAuthError(
                "Authentication service is unavailable or token could not be verified.",
                status_code=401,
                code="auth_verification_failed",
            ) from exc
    else:
        # Cryptographic RS256 verification against Google's public Firebase x509 certs
        try:
            decoded = google_id_token.verify_firebase_token(
                id_token,
                _google_transport_request,
                audience=cfg.firebase_project_id,
            )
        except ValueError as exc:
            msg = str(exc).lower()
            if "expired" in msg:
                raise FirebaseAuthError(
                    "Authentication token has expired. Please sign in again.",
                    status_code=401,
                    code="token_expired",
                ) from exc
            raise FirebaseAuthError(
                "Invalid authentication token.",
                status_code=401,
                code="invalid_token",
            ) from exc
        except Exception as exc:
            logger.error("Firebase public JWKS verification error: %s", type(exc).__name__)
            raise FirebaseAuthError(
                "Authentication service is unavailable or token could not be verified.",
                status_code=401,
                code="auth_verification_failed",
            ) from exc

    uid = decoded.get("uid") or decoded.get("sub")
    if not uid:
        raise FirebaseAuthError("Token missing subject UID.", status_code=401, code="invalid_token")

    role = str(decoded.get("role") or ("admin" if decoded.get("admin") is True else "user")).lower()
    if role not in {"user", "admin"}:
        role = "user"

    return DecodedFirebaseToken(
        uid=uid,
        email=decoded.get("email"),
        email_verified=bool(decoded.get("email_verified", False)),
        display_name=decoded.get("name"),
        role=role,
        claims=decoded,
    )


def delete_firebase_user(uid: str, settings: Settings | None = None) -> None:
    """Delete a Firebase Auth user by UID."""
    app = get_firebase_app(settings)
    fb_auth.delete_user(uid, app=app)
