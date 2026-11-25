from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import UserOut, UserPreferencesIn, UserPreferencesOut, UserUpdateIn
from app.services.firestore_service import FirestoreService
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserUpdateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    return UserService(db).update_profile(user, payload)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    UserService(db).delete_account(user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me/preferences", response_model=UserPreferencesOut)
def get_my_preferences(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPreferencesOut:
    return FirestoreService(db).get_preferences(user.firebase_uid)


@router.patch("/me/preferences", response_model=UserPreferencesOut)
def update_my_preferences(
    payload: UserPreferencesIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPreferencesOut:
    return FirestoreService(db).update_preferences(user.firebase_uid, payload)
