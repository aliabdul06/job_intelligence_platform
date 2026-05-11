"""
Recommendation engine: scores jobs against a user profile
using weighted skill, role, experience, and location matching.
"""


def _normalize(items: list[str]) -> set[str]:
    """Lowercase and strip a list of strings for comparison."""
    return {s.strip().lower() for s in items if s}


def calculate_match_score(user_profile: dict, job: dict) -> float:
    """
    Score a job against a user profile.

    Weights:
        - Skill overlap:     40%
        - Role match:        30%
        - Experience match:  20%
        - Location match:    10%

    Returns a score between 0.0 and 100.0.
    """
    score = 0.0

    # ── Skill overlap (40%) ────────────────────────────────────────────
    user_skills = _normalize(user_profile.get("skills", []))
    job_skills_structured = _normalize(job.get("skills", []))
    job_skills_nlp = _normalize(job.get("nlp_extracted_skills", []))
    job_skills = job_skills_structured | job_skills_nlp

    if user_skills and job_skills:
        overlap = len(user_skills & job_skills)
        max_possible = min(len(user_skills), len(job_skills))
        score += (overlap / max_possible) * 40 if max_possible else 0

    # ── Role match (30%) ───────────────────────────────────────────────
    desired_roles = _normalize(user_profile.get("desired_roles", []))
    job_role = (job.get("role_category") or "").strip().lower()

    if desired_roles and job_role:
        if job_role in desired_roles:
            score += 30
        else:
            # Partial match — check if any desired role appears in the job title
            job_title_lower = (job.get("job_title") or "").lower()
            for role in desired_roles:
                if role in job_title_lower:
                    score += 20
                    break

    # ── Experience match (20%) ─────────────────────────────────────────
    user_exp = user_profile.get("experience_years")
    job_exp_level = (job.get("experience_level") or "").strip()

    if user_exp is not None and job_exp_level:
        exp_ranges = {
            "Entry Level": (0, 1),
            "1-2 Years": (1, 2),
            "3-5 Years": (3, 5),
            "5+ Years": (5, 15),
            "10+ Years": (10, 30),
        }
        if job_exp_level in exp_ranges:
            low, high = exp_ranges[job_exp_level]
            if low <= user_exp <= high:
                score += 20
            elif abs(user_exp - low) <= 1 or abs(user_exp - high) <= 1:
                score += 12  # close match
            elif abs(user_exp - low) <= 2:
                score += 6   # loose match

    # ── Location match (10%) ───────────────────────────────────────────
    loc_pref = (user_profile.get("location_preference") or "").strip().lower()
    job_region = (job.get("region") or "").strip().lower()
    job_location = (job.get("location") or "").strip().lower()

    if loc_pref:
        if loc_pref in job_region or loc_pref in job_location:
            score += 10
        elif job_region and any(word in job_region for word in loc_pref.split()):
            score += 5

    return round(score, 1)


def get_recommendations(user_profile: dict, jobs: list[dict], limit: int = 20) -> list[dict]:
    """
    Score all jobs against the user profile and return the top matches.
    Each returned job dict includes a 'match_score' field.
    """
    scored = []
    for job in jobs:
        score = calculate_match_score(user_profile, job)
        if score > 0:
            job_copy = dict(job)
            job_copy["match_score"] = score
            scored.append(job_copy)

    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return scored[:limit]


def get_skills_gap(
    user_skills: list[str],
    market_skills: list[dict],
    limit: int = 10,
) -> list[dict]:
    """
    Identify trending market skills the user doesn't have.

    Args:
        user_skills: list of user's current skills
        market_skills: list of dicts with 'skill' and 'mentions' keys (from DB)

    Returns:
        List of skill gap dicts with skill name, market mentions, and relevance level.
    """
    user_set = _normalize(user_skills)
    gaps = []

    for entry in market_skills:
        skill_name = entry.get("skill", "").strip().lower()
        mentions = entry.get("mentions", 0)

        if skill_name and skill_name not in user_set:
            # Determine relevance based on market position
            if mentions >= 300:
                relevance = "high"
            elif mentions >= 150:
                relevance = "medium"
            else:
                relevance = "low"

            gaps.append({
                "skill": entry.get("skill", skill_name),
                "market_mentions": mentions,
                "relevance": relevance,
            })

    return gaps[:limit]
