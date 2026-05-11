from fastapi import APIRouter, HTTPException, Query, status

from app.database import database

router = APIRouter(prefix="/regions", tags=["Regions"])


@router.get("/top")
async def get_top_regions(
    limit: int = Query(15, ge=1, le=50, description="Number of top regions"),
):
    cursor = database.regions_analytics.find().sort("count", -1).limit(limit)
    regions = []
    async for doc in cursor:
        regions.append({
            "region": doc["region"],
            "count": doc["count"],
        })

    return {"top_regions": regions, "count": len(regions)}


@router.get("/{region_name}/stats")
async def get_region_stats(region_name: str):
    import re
    escaped = re.escape(region_name)

    # Count jobs in this region
    region_filter = {"region": {"$regex": escaped, "$options": "i"}}
    job_count = await database.jobs.count_documents(region_filter)

    if job_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No jobs found in region '{region_name}'",
        )

    # Top roles in this region
    role_pipeline = [
        {"$match": region_filter},
        {"$group": {"_id": "$role_category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    role_cursor = database.jobs.aggregate(role_pipeline)
    top_roles = [{"role": doc["_id"], "count": doc["count"]} async for doc in role_cursor]

    # Top skills in this region
    skills_pipeline = [
        {"$match": region_filter},
        {"$unwind": "$skills"},
        {"$group": {"_id": {"$toLower": "$skills"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15},
    ]
    skills_cursor = database.jobs.aggregate(skills_pipeline)
    top_skills = [{"skill": doc["_id"], "mentions": doc["count"]} async for doc in skills_cursor]

    # Experience distribution
    exp_pipeline = [
        {"$match": region_filter},
        {"$group": {"_id": "$experience_level", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    exp_cursor = database.jobs.aggregate(exp_pipeline)
    experience = [{"level": doc["_id"], "count": doc["count"]} async for doc in exp_cursor]

    return {
        "region": region_name,
        "total_jobs": job_count,
        "top_roles": top_roles,
        "top_skills": top_skills,
        "experience_distribution": experience,
    }
