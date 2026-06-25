import asyncio
import os
import re
import sys
from collections import Counter
from pathlib import Path

import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient

# Resolve paths
SCRIPT_DIR = Path(__file__).resolve().parent  # backend/app/
PROJECT_ROOT = SCRIPT_DIR.parent.parent       # job_intelligence_platform/
CSV_PATH = PROJECT_ROOT / "output" / "enriched_job_postings.csv"
TOP_SKILLS_CSV = PROJECT_ROOT / "output" / "top_skills.csv"
TOP_ROLES_CSV = PROJECT_ROOT / "output" / "top_roles.csv"
SUMMARY_CSV = PROJECT_ROOT / "output" / "overall_summary.csv"

# Import settings
sys.path.insert(0, str(SCRIPT_DIR.parent))
from app.config import settings


# ── NLP helpers (same as nlp_analysis.py) ──────────────────────────────────
EXPERIENCE_MAP = {
    "Entry level": "Entry Level", "Internship": "Entry Level", "Junior": "Entry Level",
    "1 year": "1-2 Years", "1 years": "1-2 Years", "2 years": "1-2 Years",
    "2+ years": "1-2 Years", "Associate": "1-2 Years",
    "3 years": "3-5 Years", "3+ years": "3-5 Years", "3-4 years": "3-5 Years",
    "3-5 years": "3-5 Years", "4 years": "3-5 Years", "4+ years": "3-5 Years",
    "5 years": "3-5 Years", "5+ years": "3-5 Years", "Mid level": "3-5 Years",
    "5-8 years": "5+ Years", "6 years": "5+ Years", "6-10 years": "5+ Years",
    "7 years": "5+ Years", "7+ years": "5+ Years", "8 years": "5+ Years",
    "8+ years": "5+ Years", "9 years": "5+ Years", "Mid-Senior level": "5+ Years",
    "Senior": "5+ Years", "Lead": "5+ Years", "Staff": "5+ Years",
    "10 years": "10+ Years", "12 years": "10+ Years", "15 years": "10+ Years",
    "20 years": "10+ Years", "30 years": "10+ Years", "30+ years": "10+ Years",
    "Principal": "10+ Years", "Director": "10+ Years", "Executive": "10+ Years",
    "Experience required": "Experience Required (Unspecified)",
    "Not Applicable": "Not Specified",
    "12 Mois": "1-2 Years", "36 Mois": "3-5 Years", "48 Mois": "3-5 Years",
    "6 Mois": "Entry Level",
}

ROLE_CATEGORIES = {
    "Data Scientist": r"data\s*scientist",
    "Data Engineer": r"data\s*engineer",
    "ML Engineer": r"(machine\s*learning|ml)\s*engineer",
    "AI Engineer": r"(ai|ia)\s*engineer|ingénieur.*(ia|ai)",
    "Data Analyst": r"data\s*analyst",
    "Full Stack Developer": r"full\s*stack",
    "DevOps / SRE": r"devops|sre|platform\s*engineer",
    "AI Architect": r"architect.*(ai|ia|data)|ai\s*architect",
    "NLP Engineer": r"nlp|natural\s*language",
    "GenAI Engineer": r"gen\s*ai|generative\s*ai|genai",
    "AI Manager / Lead": r"(manager|lead|director|head|responsable).*(ai|ia|data)|ai.*(manager|lead|director)",
    "Consultant AI / Data": r"consultant.*(ai|ia|data)|conseil.*(ai|ia|data)",
    "Research / PhD": r"(research|r&d|chercheur|doctorant|phd)",
    "Software Engineer": r"software\s*engineer|développeur|developer(?!.*ai)",
    "Project Manager": r"project\s*manager|chef\s*de\s*projet",
    "Product Manager / Owner": r"product\s*(manager|owner)",
    "Intern / Apprentice": r"(alternance|stagiaire|intern|apprenti)",
}

SKILL_KEYWORDS = [
    "python", "java", "javascript", "typescript", r"r\b", r"c\+\+", "c#",
    r"go\b", "rust", "scala", "ruby", "php", "sql", "nosql",
    "machine learning", "deep learning", "nlp", "natural language processing",
    "computer vision", "reinforcement learning", "generative ai", "genai",
    "llm", "large language model", "transformers", "rag", "retrieval.augmented",
    "fine.tuning", "prompt engineering", "langchain", "llamaindex", "langgraph",
    "hugging face", "gpt", r"agents?\b",
    "tensorflow", "pytorch", "keras", "scikit.learn", "sklearn",
    "xgboost", "lightgbm", "spacy", "opencv",
    "pandas", "numpy", "spark", "hadoop", "kafka", "airflow", "dbt",
    "etl", "elt", "data pipeline", "power bi", "tableau", "looker",
    "snowflake", "databricks", "bigquery",
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "neo4j",
    "pinecone", "faiss", "weaviate", "chroma", "pgvector",
    "aws", "azure", "gcp", "google cloud", "sagemaker", "vertex ai", "bedrock",
    "docker", "kubernetes", "terraform", "ci/cd", "ci cd",
    "devops", "mlops", "mlflow", "kubeflow", "git", "github", "gitlab",
    "fastapi", "flask", "django", "rest api", "graphql", "microservices", "api",
    "agile", "scrum",
]


def extract_skills_from_text(text: str) -> list[str]:
    if pd.isna(text):
        return []
    text_lower = text.lower()
    found = []
    for kw in SKILL_KEYWORDS:
        pattern = r"\b" + kw
        if re.search(pattern, text_lower):
            clean = re.sub(r"\\b|\\\+|\\\?|\?", "", kw)
            clean = clean.replace("\\+", "").replace("\\", "").strip()
            clean = clean.replace("genai", "generative ai")
            clean = clean.replace("large language model", "llm")
            clean = clean.replace("retrieval.augmented", "rag")
            clean = clean.replace("natural language processing", "nlp")
            clean = clean.replace("ci cd", "ci/cd")
            clean = clean.replace("scikit.learn", "scikit-learn")
            clean = clean.replace("fine.tuning", "fine-tuning")
            clean = clean.replace("google cloud", "gcp")
            found.append(clean)
    return found


def categorize_role(title: str) -> str:
    title_lower = str(title).lower()
    for category, pattern in ROLE_CATEGORIES.items():
        if re.search(pattern, title_lower):
            return category
    return "Other"


def extract_region(location: str) -> str:
    if pd.isna(location) or str(location).strip() == "nan":
        return "Unknown"
    parts = [p.strip() for p in str(location).split(",")]
    return parts[1].strip() if len(parts) >= 2 else parts[0].strip()


# ── Main seed function ─────────────────────────────────────────────────────
async def seed():
    print("=" * 60)
    print("  SEEDING MONGODB")
    print("=" * 60)

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    # ── 1. Load and prepare data ───────────────────────────────────────
    print(f"\n[1/6] Loading CSV from {CSV_PATH} ...")

    if not CSV_PATH.exists():
        # Fall back to raw CSV if enriched doesn't exist
        raw_csv = PROJECT_ROOT / "job_postings_combined.csv"
        if not raw_csv.exists():
            print(f"ERROR: Cannot find CSV at {CSV_PATH} or {raw_csv}")
            return
        df = pd.read_csv(raw_csv)
        # Enrich inline
        df["skills"] = df["skills"].astype(str).replace("nan", "")
        df["experience_level"] = df["experience"].map(EXPERIENCE_MAP).fillna("Not Specified")
        df["role_category"] = df["job_title"].apply(categorize_role)
        df["region"] = df["location"].apply(extract_region)
        df["nlp_extracted_skills"] = df["description"].apply(
            lambda x: ", ".join(extract_skills_from_text(x))
        )
    else:
        df = pd.read_csv(CSV_PATH)
        # Ensure enriched columns exist
        if "experience_level" not in df.columns:
            df["experience_level"] = df["experience"].map(EXPERIENCE_MAP).fillna("Not Specified")
        if "role_category" not in df.columns:
            df["role_category"] = df["job_title"].apply(categorize_role)
        else:
            # Backfill any missing/NaN role categories from older enrichment runs
            df["role_category"] = df["role_category"].fillna("Other").replace("", "Other")
        if "region" not in df.columns:
            df["region"] = df["location"].apply(extract_region)

    print(f"   Loaded {len(df)} job postings")

    # ── 2. Insert jobs ─────────────────────────────────────────────────
    print("[2/6] Inserting jobs into MongoDB ...")
    await db["jobs"].drop()

    jobs_docs = []
    for _, row in df.iterrows():
        # Parse skills into arrays
        skills_raw = str(row.get("skills", ""))
        skills_list = [s.strip() for s in skills_raw.split(",") if s.strip() and s.strip() != "nan"]

        nlp_raw = str(row.get("nlp_extracted_skills", ""))
        nlp_list = [s.strip() for s in nlp_raw.split(",") if s.strip() and s.strip() != "nan"]

        doc = {
            "job_title": str(row.get("job_title", "")),
            "description": str(row.get("description", "")),
            "skills": skills_list,
            "experience": str(row.get("experience", "")),
            "experience_level": str(row.get("experience_level", "Not Specified")),
            "location": str(row.get("location", "")),
            "region": str(row.get("region", "Unknown")),
            "role_category": str(row.get("role_category", "Other")),
            "job_url": str(row.get("job_url", "")),
            "nlp_extracted_skills": nlp_list,
        }
        jobs_docs.append(doc)

    if jobs_docs:
        await db["jobs"].insert_many(jobs_docs)
    print(f"   Inserted {len(jobs_docs)} jobs")

    # ── 3. Compute and insert skills analytics ─────────────────────────
    print("[3/6] Computing skills analytics ...")
    await db["skills_analytics"].drop()

    # Combine structured + NLP skills as a UNION per posting, so a skill is
    # counted at most once per posting (prevents mentions > total_postings).
    combined_counts = Counter()
    PLACEHOLDER_SKILLS = {"", "nan", "none", "null"}
    for doc in jobs_docs:
        posting_skills = {s.lower().strip() for s in doc["skills"]} | {s.lower().strip() for s in doc["nlp_extracted_skills"]}
        posting_skills -= PLACEHOLDER_SKILLS
        combined_counts.update(posting_skills)

    skills_docs = [
        {"skill": skill, "mentions": count}
        for skill, count in combined_counts.most_common()
    ]
    if skills_docs:
        await db["skills_analytics"].insert_many(skills_docs)
    print(f"   Stored {len(skills_docs)} unique skills")

    # ── 4. Compute roles, experience, regions analytics ────────────────
    print("[4/6] Computing roles, experience, regions analytics ...")

    # Roles (exclude the "Other" catch-all from rankings)
    await db["roles_analytics"].drop()
    role_counts = df["role_category"].value_counts()
    role_counts = role_counts[role_counts.index != "Other"]
    roles_docs = [
        {"role": role, "count": int(count)}
        for role, count in role_counts.items()
    ]
    if roles_docs:
        await db["roles_analytics"].insert_many(roles_docs)

    # Experience
    await db["experience_analytics"].drop()
    exp_order = ["Entry Level", "1-2 Years", "3-5 Years", "5+ Years", "10+ Years",
                 "Experience Required (Unspecified)", "Not Specified"]
    exp_counts = df["experience_level"].value_counts()
    exp_docs = []
    for i, level in enumerate(exp_order):
        count = int(exp_counts.get(level, 0))
        if count > 0:
            exp_docs.append({"level": level, "count": count, "order": i})
    if exp_docs:
        await db["experience_analytics"].insert_many(exp_docs)

    # Regions (drop placeholders so "Unknown"/"None" never surfaces)
    await db["regions_analytics"].drop()
    region_counts = df["region"].value_counts()
    region_counts = region_counts[~region_counts.index.isin(["Unknown", "None", "nan", ""])]
    region_docs = [
        {"region": region, "count": int(count)}
        for region, count in region_counts.items()
    ]
    if region_docs:
        await db["regions_analytics"].insert_many(region_docs)

    print(f"   Roles: {len(roles_docs)}, Experience levels: {len(exp_docs)}, Regions: {len(region_docs)}")

    # ── 5. Skills by role ──────────────────────────────────────────────
    print("[5/6] Computing skills by role ...")
    await db["skills_by_role"].drop()

    role_skill_map = {}
    for doc in jobs_docs:
        role = doc["role_category"]
        if role in ("Other", "", "nan", "None"):
            continue
        posting_skills = {s.lower().strip() for s in doc["skills"]} | {s.lower().strip() for s in doc["nlp_extracted_skills"]}
        posting_skills -= PLACEHOLDER_SKILLS
        if role not in role_skill_map:
            role_skill_map[role] = Counter()
        role_skill_map[role].update(posting_skills)

    sbr_docs = []
    for role in role_counts.index:
        if role in role_skill_map:
            top_skills = [
                {"skill": s, "mentions": c}
                for s, c in role_skill_map[role].most_common(15)
            ]
            sbr_docs.append({"role": role, "skills": top_skills})
    if sbr_docs:
        await db["skills_by_role"].insert_many(sbr_docs)
    print(f"   Stored skills for {len(sbr_docs)} roles")

    # ── 6. Summary ─────────────────────────────────────────────────────
    print("[6/6] Storing summary metrics ...")
    await db["summary"].drop()

    summary_doc = {
        "total_postings": len(df),
        "unique_job_titles": int(df["job_title"].nunique()),
        "unique_locations": int(df["location"].nunique()),
        "postings_with_skills": int(df["skills"].notna().sum()),
        "unique_skills": len(combined_counts),
        "top_role": str(role_counts.index[0]) if len(role_counts) > 0 else "",
        "top_skill": skills_docs[0]["skill"] if skills_docs else "",
        "top_region": str(region_counts.index[0]) if len(region_counts) > 0 else "",
    }
    await db["summary"].insert_one(summary_doc)

    # ── Create indexes ─────────────────────────────────────────────────
    print("\n[*] Creating indexes ...")
    await db["jobs"].create_index([("job_title", "text"), ("description", "text")])
    await db["jobs"].create_index("role_category")
    await db["jobs"].create_index("experience_level")
    await db["jobs"].create_index("region")
    await db["jobs"].create_index("skills")
    await db["users"].create_index("email", unique=True)
    print("   Indexes created")

    client.close()

    print("\n" + "=" * 60)
    print("  SEEDING COMPLETE")
    print("=" * 60)
    print(f"  Database: {settings.MONGODB_DB_NAME}")
    print(f"  Jobs: {len(jobs_docs)}")
    print(f"  Skills: {len(skills_docs)}")
    print(f"  Roles: {len(roles_docs)}")
    print(f"  Regions: {len(region_docs)}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
