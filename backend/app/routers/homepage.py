from fastapi import APIRouter, Query

from app.database import database

router = APIRouter(prefix="/homepage", tags=["Homepage"])


@router.get("")
async def get_homepage_data(
    skills_limit: int = Query(10, ge=1, le=30),
    jobs_limit: int = Query(10, ge=1, le=30),
):
    # ── Summary metrics ────────────────────────────────────────────────
    summary_doc = await database.summary.find_one()
    summary = {}
    if summary_doc:
        summary = {k: v for k, v in summary_doc.items() if k != "_id"}

    # ── Top skills ─────────────────────────────────────────────────────
    cursor = database.skills_analytics.find().sort("mentions", -1).limit(skills_limit)
    top_skills = []
    async for doc in cursor:
        top_skills.append({"skill": doc["skill"], "mentions": doc["mentions"]})

    # ── Top roles ──────────────────────────────────────────────────────
    cursor = database.roles_analytics.find().sort("count", -1)
    top_roles = []
    total_jobs = sum([doc.get("count", 0) async for doc in database.roles_analytics.find()])
    cursor = database.roles_analytics.find().sort("count", -1)
    async for doc in cursor:
        count = doc["count"]
        top_roles.append({
            "role": doc["role"],
            "count": count,
            "percentage": round(count / total_jobs * 100, 1) if total_jobs else 0,
        })

    # ── Experience distribution ────────────────────────────────────────
    cursor = database.experience_analytics.find().sort("order", 1)
    experience_dist = []
    async for doc in cursor:
        count = doc["count"]
        experience_dist.append({
            "level": doc["level"],
            "count": count,
            "percentage": round(count / total_jobs * 100, 1) if total_jobs else 0,
        })

    # ── Top regions ────────────────────────────────────────────────────
    cursor = database.regions_analytics.find().sort("count", -1).limit(15)
    top_regions = []
    async for doc in cursor:
        top_regions.append({"region": doc["region"], "count": doc["count"]})

    # ── Latest jobs ────────────────────────────────────────────────────
    cursor = database.jobs.find().sort("_id", -1).limit(jobs_limit)
    latest_jobs = []
    async for doc in cursor:
        latest_jobs.append({
            "id": str(doc["_id"]),
            "job_title": doc.get("job_title", ""),
            "skills": doc.get("skills", []),
            "experience_level": doc.get("experience_level"),
            "location": doc.get("location"),
            "region": doc.get("region"),
            "role_category": doc.get("role_category"),
            "job_url": doc.get("job_url"),
        })

    # ── Skill-role matrix ──────────────────────────────────────────────
    cursor = database.skills_by_role.find()
    skill_role_matrix = []
    async for doc in cursor:
        skill_role_matrix.append({
            "role": doc["role"],
            "skills": doc["skills"][:8],  # top 8 per role
        })

    return {
        "summary": summary,
        "top_skills": top_skills,
        "top_roles": top_roles,
        "experience_distribution": experience_dist,
        "top_regions": top_regions,
        "latest_jobs": latest_jobs,
        "skill_role_matrix": skill_role_matrix,
    }
