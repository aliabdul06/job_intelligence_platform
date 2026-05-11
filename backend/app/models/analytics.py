from pydantic import BaseModel, Field


class SkillCount(BaseModel):
    skill: str
    mentions: int


class RoleCount(BaseModel):
    role: str
    count: int
    percentage: float


class ExperienceDistribution(BaseModel):
    level: str
    count: int
    percentage: float


class RegionStats(BaseModel):
    region: str
    count: int


class SkillsByRole(BaseModel):
    role: str
    skills: list[SkillCount]


class SkillGap(BaseModel):
    skill: str
    market_mentions: int
    relevance: str = Field(description="high / medium / low")


class HomepageData(BaseModel):
    summary: dict
    top_skills: list[SkillCount]
    top_roles: list[RoleCount]
    experience_distribution: list[ExperienceDistribution]
    top_regions: list[RegionStats]
    latest_jobs: list[dict]
    skill_role_matrix: list[SkillsByRole]
