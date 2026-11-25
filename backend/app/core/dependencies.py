from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.firebase import DecodedFirebaseToken, FirebaseAuthError, verify_firebase_id_token
from app.database.session import get_db
from app.models.user import User
from app.services.user_service import UserService

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class AuthenticatedContext:
    user: User
    token: DecodedFirebaseToken


def get_auth_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AuthenticatedContext:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header with Bearer token is required.",
        )

    try:
        decoded = verify_firebase_id_token(credentials.credentials)
    except FirebaseAuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    user_service = UserService(db)
    user = user_service.get_or_create_from_token(decoded)

    if user.account_status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled or deleted.",
        )

    return AuthenticatedContext(user=user, token=decoded)


def get_current_user(ctx: AuthenticatedContext = Depends(get_auth_context)) -> User:
    return ctx.user


def require_admin(ctx: AuthenticatedContext = Depends(get_auth_context)) -> User:
    if ctx.token.role != "admin" or ctx.user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required.",
        )
    return ctx.user
