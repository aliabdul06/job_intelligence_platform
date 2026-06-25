from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Auth request models ────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=100)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


# ── User profile ───────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    skills: list[str] = Field(default_factory=list, description="User's technical skills")
    experience_years: int | None = Field(None, ge=0, le=50)
    education: str | None = Field(None, max_length=200, description="e.g. MSc Computer Science")
    desired_roles: list[str] = Field(default_factory=list, description="Roles the user is interested in")
    location_preference: str | None = Field(None, max_length=100, description="Preferred work location/region")
    bio: str | None = Field(None, max_length=500)


class UserProfileUpdate(BaseModel):
    skills: list[str] | None = None
    experience_years: int | None = Field(None, ge=0, le=50)
    education: str | None = None
    desired_roles: list[str] | None = None
    location_preference: str | None = None
    bio: str | None = None


# ── Response models ────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    profile: UserProfile
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
