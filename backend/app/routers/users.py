"""
Users router: profile CRUD for the authenticated user.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import database
from app.models.user import UserResponse, UserProfile, UserProfileUpdate
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


def _user_to_response(user: dict) -> UserResponse:
    """Convert a MongoDB user document to the API response model."""
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user["full_name"],
        profile=UserProfile(**user.get("profile", {})),
        created_at=user.get("created_at", datetime.now(timezone.utc)),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return _user_to_response(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    full_name: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    """Update the current user's basic info (full_name)."""
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    if full_name is not None:
        update_fields["full_name"] = full_name

    from bson import ObjectId

    await database.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_fields},
    )

    updated = await database.users.find_one({"_id": current_user["_id"]})
    return _user_to_response(updated)


@router.put("/me/profile", response_model=UserResponse)
async def update_profile(
    profile_update: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Update the current user's profile (skills, experience, education,
    desired roles, location preference, bio).
    Only provided fields are updated; others remain unchanged.
    """
    current_profile = current_user.get("profile", {})

    # Merge: only overwrite fields that were explicitly provided
    update_data = profile_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        current_profile[key] = value

    await database.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "profile": current_profile,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    updated = await database.users.find_one({"_id": current_user["_id"]})
    return _user_to_response(updated)
