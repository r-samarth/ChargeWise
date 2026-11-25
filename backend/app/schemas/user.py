from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    firebase_uid: str
    email: EmailStr
    display_name: str | None = None
    phone: str | None = None
    role: str
    account_status: str
    created_at: datetime
    updated_at: datetime


class UserUpdateIn(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=32)


class RouteSettings(BaseModel):
    reserveSocPct: float = Field(default=15.0, ge=5.0, le=50.0)
    preferFastChargers: bool = True
    maxDetourKm: float = Field(default=12.0, ge=1.0, le=50.0)
    preferredAmenities: list[str] = Field(default_factory=lambda: ["restaurant", "washroom"], max_length=10)


class NotificationSettings(BaseModel):
    tripReminders: bool = True
    dataAlerts: bool = True
    emailDigest: bool = False


class UserPreferencesIn(BaseModel):
    preferredUnits: Literal["metric", "imperial"] = "metric"
    preferredMapStyle: Literal["standard", "terrain"] = "standard"
    preferredRouteSettings: RouteSettings = Field(default_factory=RouteSettings)
    preferredNotificationSettings: NotificationSettings = Field(default_factory=NotificationSettings)


class UserPreferencesOut(UserPreferencesIn):
    updatedAt: datetime | None = None
    firestoreAvailable: bool = True


class NotificationOut(BaseModel):
    id: str
    title: str
    message: str
    type: str
    read: bool
    createdAt: datetime | None = None
    relatedEntityId: str | None = None
    deepLink: str | None = None


class NotificationListOut(BaseModel):
    items: list[NotificationOut]
    nextCursor: str | None = None
    firestoreAvailable: bool = True


class NotificationUpdateIn(BaseModel):
    read: bool


class ActivityOut(BaseModel):
    id: str
    type: str
    title: str
    description: str
    createdAt: datetime | None = None
    relatedEntityId: str | None = None
    metadata: dict = Field(default_factory=dict)


class ActivityListOut(BaseModel):
    items: list[ActivityOut]
    nextCursor: str | None = None
    firestoreAvailable: bool = True
