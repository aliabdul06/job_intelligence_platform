import math
import re

from fastapi import APIRouter, Query

from app.config import settings
from app.database import database

router = APIRouter(prefix="/search", tags=["Search"])


def _serialize_job(job: dict) -> dict:
    job["_id"] = str(job["_id"])
    return job


@router.get("")
async def search_jobs(
    q: str = Query(None, description="Full-text search query"),
    skills: str = Query(None, description="Comma-separated skills filter"),
    location: str = Query(None, description="Location / region filter"),
    experience: str = Query(None, description="Experience level filter"),
    role: str = Query(None, description="Role category filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(None, ge=1, le=100),
):
    if page_size is None:
        page_size = settings.DEFAULT_PAGE_SIZE

    query = {}

    # Full-text search
    if q:
        # Use $text if text index exists, otherwise fall back to regex
        try:
            # Try text search first
            test = await database.jobs.find_one({"$text": {"$search": q}})
            query["$text"] = {"$search": q}
        except Exception:
            # Fallback to regex on title + description
            escaped = re.escape(q)
            query["$or"] = [
                {"job_title": {"$regex": escaped, "$options": "i"}},
                {"description": {"$regex": escaped, "$options": "i"}},
            ]

    # Skills filter
    if skills:
        skill_list = [s.strip() for s in skills.split(",") if s.strip()]
        if skill_list:
            # Match jobs that contain ANY of the requested skills
            skill_patterns = [re.compile(re.escape(s), re.IGNORECASE) for s in skill_list]
            query["$or"] = query.get("$or", []) or []
            # Use $elemMatch style or regex on the array
            skills_condition = {
                "skills": {"$elemMatch": {"$regex": "|".join(re.escape(s) for s in skill_list), "$options": "i"}}
            }
            if "$and" not in query:
                query["$and"] = []
            query["$and"].append(skills_condition)
            # Clean up empty $or if we only had skills
            if "$or" in query and not query["$or"]:
                del query["$or"]

    # Location filter
    if location:
        loc_escaped = re.escape(location)
        loc_condition = {
            "$or": [
                {"location": {"$regex": loc_escaped, "$options": "i"}},
                {"region": {"$regex": loc_escaped, "$options": "i"}},
            ]
        }
        if "$and" not in query:
            query["$and"] = []
        query["$and"].append(loc_condition)

    # Experience filter
    if experience:
        exp_condition = {"experience_level": {"$regex": re.escape(experience), "$options": "i"}}
        if "$and" not in query:
            query["$and"] = []
        query["$and"].append(exp_condition)

    # Role filter
    if role:
        role_condition = {"role_category": {"$regex": re.escape(role), "$options": "i"}}
        if "$and" not in query:
            query["$and"] = []
        query["$and"].append(role_condition)

    # Clean empty $and
    if "$and" in query and not query["$and"]:
        del query["$and"]

    total = await database.jobs.count_documents(query)
    total_pages = math.ceil(total / page_size) if total else 1
    skip = (page - 1) * page_size

    cursor = database.jobs.find(query).skip(skip).limit(page_size)
    jobs = [_serialize_job(doc) async for doc in cursor]

    return {
        "jobs": jobs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "filters_applied": {
            "q": q,
            "skills": skills,
            "location": location,
            "experience": experience,
            "role": role,
        },
    }
