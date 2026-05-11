from fastapi import APIRouter, Depends, Query

from app.database import database
from app.services.auth_service import get_current_user
from app.services.recommendation_engine import get_recommendations, get_skills_gap

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("")
async def get_job_recommendations(
    limit: int = Query(20, ge=1, le=50, description="Number of recommendations"),
    current_user: dict = Depends(get_current_user),
):
    user_profile = current_user.get("profile", {})

    # Fetch all jobs from DB
    cursor = database.jobs.find()
    all_jobs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        all_jobs.append(doc)

    # Get scored recommendations
    recommendations = get_recommendations(user_profile, all_jobs, limit=limit)

    return {
        "recommendations": recommendations,
        "count": len(recommendations),
        "user_skills": user_profile.get("skills", []),
        "user_desired_roles": user_profile.get("desired_roles", []),
    }


@router.get("/skills-gap")
async def get_user_skills_gap(
    limit: int = Query(10, ge=1, le=30, description="Number of skill gaps to show"),
    current_user: dict = Depends(get_current_user),
):
    user_profile = current_user.get("profile", {})
    user_skills = user_profile.get("skills", [])

    # Fetch market skill data
    cursor = database.skills_analytics.find().sort("mentions", -1)
    market_skills = []
    async for doc in cursor:
        market_skills.append({
            "skill": doc["skill"],
            "mentions": doc["mentions"],
        })

    gaps = get_skills_gap(user_skills, market_skills, limit=limit)

    return {
        "skills_gap": gaps,
        "user_current_skills": user_skills,
        "total_gaps_found": len(gaps),
    }
