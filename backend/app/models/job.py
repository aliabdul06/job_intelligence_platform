from pydantic import BaseModel, Field


class JobPosting(BaseModel):
    id: str = Field(alias="_id", default=None)
    job_title: str
    description: str
    skills: list[str] = Field(default_factory=list)
    experience: str | None = None
    experience_level: str | None = None
    location: str | None = None
    region: str | None = None
    role_category: str | None = None
    job_url: str | None = None
    nlp_extracted_skills: list[str] = Field(default_factory=list)

    class Config:
        populate_by_name = True


class JobListResponse(BaseModel):
    jobs: list[JobPosting]
    total: int
    page: int
    page_size: int
    total_pages: int
