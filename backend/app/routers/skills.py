from fastapi import APIRouter, HTTPException, Query, status

from app.database import database

router = APIRouter(prefix="/skills", tags=["Skills"])


@router.get("/top")
async def get_top_skills(
    limit: int = Query(20, ge=1, le=100, description="Number of top skills to return"),
):
    cursor = database.skills_analytics.find().sort("mentions", -1).limit(limit)
    skills = []
    rank = 1
    async for doc in cursor:
        skills.append({
            "rank": rank,
            "skill": doc["skill"],
            "mentions": doc["mentions"],
        })
        rank += 1

    return {"top_skills": skills, "count": len(skills)}


@router.get("/distribution")
async def get_skill_distribution():
    cursor = database.skills_analytics.find().sort("mentions", -1)
    skills = []
    async for doc in cursor:
        skills.append({
            "skill": doc["skill"],
            "mentions": doc["mentions"],
        })

    total_mentions = sum(s["mentions"] for s in skills)
    for s in skills:
        s["percentage"] = round(s["mentions"] / total_mentions * 100, 2) if total_mentions else 0

    return {"distribution": skills, "total_unique_skills": len(skills), "total_mentions": total_mentions}


@router.get("/by-role")
async def get_skills_by_role():
    cursor = database.skills_by_role.find()
    result = []
    async for doc in cursor:
        result.append({
            "role": doc["role"],
            "skills": doc["skills"],
        })

    return {"skills_by_role": result, "total_roles": len(result)}


@router.get("/by-role/{role_name}")
async def get_skills_for_role(role_name: str):
    doc = await database.skills_by_role.find_one(
        {"role": {"$regex": f"^{role_name}$", "$options": "i"}}
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name}' not found. Use /skills/by-role to see available roles.",
        )

    return {
        "role": doc["role"],
        "skills": doc["skills"],
    }
