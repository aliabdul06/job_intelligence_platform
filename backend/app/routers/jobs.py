import math

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, status

from app.config import settings
from app.database import database

router = APIRouter(prefix="/jobs", tags=["Jobs"])


def _serialize_job(job: dict) -> dict:
    job["_id"] = str(job["_id"])
    return job


@router.get("")
async def list_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(None, ge=1, le=100, description="Items per page"),
    role: str = Query(None, description="Filter by role category"),
    experience: str = Query(None, description="Filter by experience level"),
    region: str = Query(None, description="Filter by region"),
):
    if page_size is None:
        page_size = settings.DEFAULT_PAGE_SIZE

    # Build filter
    query = {}
    if role:
        query["role_category"] = {"$regex": role, "$options": "i"}
    if experience:
        query["experience_level"] = {"$regex": experience, "$options": "i"}
    if region:
        query["region"] = {"$regex": region, "$options": "i"}

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
    }


@router.get("/latest")
async def get_latest_jobs(
    limit: int = Query(10, ge=1, le=50, description="Number of latest jobs"),
):
    cursor = database.jobs.find().sort("_id", -1).limit(limit)
    jobs = [_serialize_job(doc) async for doc in cursor]
    return {"jobs": jobs, "count": len(jobs)}


@router.get("/stats")
async def get_job_stats():
    total = await database.jobs.count_documents({})

    # Count by role category
    role_pipeline = [
        {"$group": {"_id": "$role_category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    role_cursor = database.jobs.aggregate(role_pipeline)
    roles = [{"role": doc["_id"], "count": doc["count"]} async for doc in role_cursor]

    # Count by experience level
    exp_pipeline = [
        {"$group": {"_id": "$experience_level", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    exp_cursor = database.jobs.aggregate(exp_pipeline)
    experience = [{"level": doc["_id"], "count": doc["count"]} async for doc in exp_cursor]

    return {
        "total_jobs": total,
        "by_role": roles,
        "by_experience": experience,
    }


@router.get("/{job_id}")
async def get_job(job_id: str):
    if not ObjectId.is_valid(job_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid job ID format",
        )

    job = await database.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    return _serialize_job(job)
