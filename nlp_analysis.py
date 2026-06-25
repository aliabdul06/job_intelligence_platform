import re
import os
import warnings
from collections import Counter
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from wordcloud import WordCloud

warnings.filterwarnings("ignore")

# ── Configuration ──────────────────────────────────────────────────────────
CSV_PATH = "job_postings_combined.csv"
OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── 1. Load & Clean Data ──────────────────────────────────────────────────
print("=" * 60)
print("  JOB INTELLIGENCE PLATFORM — NLP ANALYSIS")
print("=" * 60)

df = pd.read_csv(CSV_PATH)
print(f"\n Loaded {len(df)} job postings with columns: {list(df.columns)}")
print(f"   Missing values:\n{df.isnull().sum().to_string()}\n")

# Clean text columns
for col in ["job_title", "description", "skills", "location"]:
    df[col] = df[col].astype(str).str.strip()
    df[col] = df[col].replace("nan", pd.NA)


# ── 2. SKILL EXTRACTION (NLP) ─────────────────────────────────────────────
print("─" * 60)
print("  TASK 1: Extract & Rank Top Skills")
print("─" * 60)

# 2a. Structured skills column  -------------------------------------------
# Skills are comma-separated in the 'skills' column. We count each skill at
# most ONCE per posting (a single posting can list a skill in both the
# structured column and the description — we don't want to double-count).
structured_skill_sets = (
    df["skills"]
    .fillna("")
    .apply(lambda s: {x.strip().lower() for x in str(s).split(",") if x.strip() and x.strip().lower() != "nan"})
)
structured_skill_counts = Counter()
for s_set in structured_skill_sets:
    structured_skill_counts.update(s_set)

# 2b. NLP-based skill extraction from descriptions  -----------------------
# Curated skill/tech keyword list (case-insensitive regex)
SKILL_KEYWORDS = [
    # Programming languages
    "python", "java", "javascript", "typescript", "r\\b", "c\\+\\+", "c#",
    "go\\b", "rust", "scala", "ruby", "php", "sql", "nosql",
    # AI / ML
    "machine learning", "deep learning", "nlp",
    "natural language processing", "computer vision",
    "reinforcement learning", "generative ai", "genai",
    "llm", "large language model", "transformers",
    "rag", "retrieval.augmented", "fine.tuning",
    "prompt engineering", "langchain", "llamaindex", "langgraph",
    "hugging face", "gpt", "agents?\\b",
    # ML Frameworks
    "tensorflow", "pytorch", "keras", "scikit.learn", "sklearn",
    "xgboost", "lightgbm", "spacy", "opencv",
    # Data
    "pandas", "numpy", "spark", "hadoop", "kafka",
    "airflow", "dbt", "etl", "elt", "data pipeline",
    "power bi", "tableau", "looker",
    "snowflake", "databricks", "bigquery",
    # Databases
    "postgresql", "mysql", "mongodb", "redis",
    "elasticsearch", "neo4j", "pinecone", "faiss",
    "weaviate", "chroma", "pgvector",
    # Cloud
    "aws", "azure", "gcp", "google cloud",
    "sagemaker", "vertex ai", "bedrock",
    # DevOps / Infra
    "docker", "kubernetes", "terraform", "ci/cd", "ci cd",
    "devops", "mlops", "mlflow", "kubeflow",
    "git", "github", "gitlab",
    # Web / API
    "fastapi", "flask", "django", "rest api", "graphql",
    "microservices", "api",
    # Methodology
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
            # Normalize the keyword for counting: strip regex syntax (\b, +, ?)
            clean = re.sub(r"\\b|\\\+|\\\?|\?", "", kw)
            clean = clean.replace("\\+", "").replace("\\", "").strip()
            # Normalize some aliases
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

# Extract skills from descriptions (skill at most once per posting via set)
nlp_skill_series = df["description"].apply(extract_skills_from_text)
nlp_skill_sets = nlp_skill_series.apply(lambda lst: set(lst) if isinstance(lst, list) else set())
nlp_skill_counts = Counter()
for s_set in nlp_skill_sets:
    nlp_skill_counts.update(s_set)

# Combine structured + NLP-extracted as a UNION per posting, so each skill is
# counted at most once per posting. This guarantees mentions <= total postings.
PLACEHOLDER_SKILLS = {"", "nan", "none", "null"}
combined_counts = Counter()
for s_set, nlp_set in zip(structured_skill_sets, nlp_skill_sets):
    combined_counts.update((s_set | nlp_set) - PLACEHOLDER_SKILLS)

# Top 20 skills
top_skills = combined_counts.most_common(20)
print("\n TOP 20 SKILLS (structured + NLP-extracted):\n")
print(f"{'Rank':<6}{'Skill':<30}{'Mentions':<10}")
print("-" * 46)
for i, (skill, count) in enumerate(top_skills, 1):
    print(f"{i:<6}{skill:<30}{count:<10}")

# Save top skills table
skills_df = pd.DataFrame(top_skills, columns=["Skill", "Mentions"])
skills_df.index = range(1, len(skills_df) + 1)
skills_df.index.name = "Rank"
skills_df.to_csv(os.path.join(OUTPUT_DIR, "top_skills.csv"))


# ── 3. IDENTIFY TOP ROLES ─────────────────────────────────────────────────
print("\n" + "─" * 60)
print("  TASK 2: Identify Top Roles")
print("─" * 60)

# Role categorization via keyword matching on job_title
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

def categorize_role(title: str) -> str:
    title_lower = str(title).lower()
    for category, pattern in ROLE_CATEGORIES.items():
        if re.search(pattern, title_lower):
            return category
    return "Other"

df["role_category"] = df["job_title"].apply(categorize_role)
# Exclude the catch-all "Other" bucket from all role rankings/visuals so
# unnamed roles never appear as a top category.
role_counts = df["role_category"].value_counts()
role_counts = role_counts[role_counts.index != "Other"]

print("\n TOP ROLES BY POSTING COUNT:\n")
print(f"{'Role Category':<35}{'Count':<8}{'%':<8}")
print("-" * 51)
for role, count in role_counts.items():
    pct = f"{count / len(df) * 100:.1f}%"
    print(f"{role:<35}{count:<8}{pct:<8}")

role_counts.to_csv(os.path.join(OUTPUT_DIR, "top_roles.csv"))


# ── 4. DEMAND TRENDS ──────────────────────────────────────────────────────
print("\n" + "─" * 60)
print("  TASK 3: Demand Trends")
print("─" * 60)

# 4a. Experience level normalization
EXPERIENCE_MAP = {
    "Entry level": "Entry Level",
    "Internship": "Entry Level",
    "Junior": "Entry Level",
    "1 year": "1-2 Years",
    "1 years": "1-2 Years",
    "2 years": "1-2 Years",
    "2+ years": "1-2 Years",
    "Associate": "1-2 Years",
    "3 years": "3-5 Years",
    "3+ years": "3-5 Years",
    "3-4 years": "3-5 Years",
    "3-5 years": "3-5 Years",
    "4 years": "3-5 Years",
    "4+ years": "3-5 Years",
    "5 years": "3-5 Years",
    "5+ years": "3-5 Years",
    "5-8 years": "5+ Years",
    "6 years": "5+ Years",
    "6-10 years": "5+ Years",
    "7 years": "5+ Years",
    "7+ years": "5+ Years",
    "8 years": "5+ Years",
    "8+ years": "5+ Years",
    "9 years": "5+ Years",
    "Mid-Senior level": "5+ Years",
    "Mid level": "3-5 Years",
    "10 years": "10+ Years",
    "12 years": "10+ Years",
    "15 years": "10+ Years",
    "20 years": "10+ Years",
    "30 years": "10+ Years",
    "30+ years": "10+ Years",
    "Senior": "5+ Years",
    "Lead": "5+ Years",
    "Staff": "5+ Years",
    "Principal": "10+ Years",
    "Director": "10+ Years",
    "Executive": "10+ Years",
    "Experience required": "Experience Required (Unspecified)",
    "Not Applicable": "Not Specified",
    "12 Mois": "1-2 Years",
    "36 Mois": "3-5 Years",
    "48 Mois": "3-5 Years",
    "6 Mois": "Entry Level",
}

df["experience_level"] = df["experience"].map(EXPERIENCE_MAP).fillna("Not Specified")
exp_order = ["Entry Level", "1-2 Years", "3-5 Years", "5+ Years", "10+ Years",
             "Experience Required (Unspecified)", "Not Specified"]
exp_counts = df["experience_level"].value_counts().reindex(exp_order, fill_value=0)

print("\n DEMAND BY EXPERIENCE LEVEL:\n")
print(f"{'Experience Level':<40}{'Postings':<10}{'%':<8}")
print("-" * 58)
for level, count in exp_counts.items():
    pct = f"{count / len(df) * 100:.1f}%"
    print(f"{level:<40}{count:<10}{pct:<8}")

# 4b. Location / Region trends
def extract_region(location: str) -> str:
    if pd.isna(location) or location == "nan":
        return "Unknown"
    parts = [p.strip() for p in str(location).split(",")]
    if len(parts) >= 2:
        return parts[1].strip()
    return parts[0].strip()

df["region"] = df["location"].apply(extract_region)
# Drop "Unknown" / "None" placeholder regions from rankings
region_counts_full = df["region"].value_counts()
region_counts_full = region_counts_full[~region_counts_full.index.isin(["Unknown", "None", "nan", ""])]
region_counts = region_counts_full.head(15)

print("\n TOP 15 REGIONS BY POSTINGS:\n")
print(f"{'Region':<40}{'Postings':<10}")
print("-" * 50)
for region, count in region_counts.items():
    print(f"{region:<40}{count:<10}")

# 4c. Skill demand by role (cross-tab)
print("\n TOP SKILLS PER ROLE CATEGORY:\n")
role_skill_map = {}
for _, row in df.iterrows():
    role = row["role_category"]
    if role in ("Other", "", "nan", "None") or pd.isna(role):
        continue
    posting_skills = set()
    if pd.notna(row["skills"]) and row["skills"] != "nan":
        posting_skills.update(
            s.strip().lower() for s in str(row["skills"]).split(",")
            if s.strip() and s.strip().lower() != "nan"
        )
    posting_skills.update(extract_skills_from_text(row["description"]))
    posting_skills -= PLACEHOLDER_SKILLS
    if role not in role_skill_map:
        role_skill_map[role] = Counter()
    role_skill_map[role].update(posting_skills)

for role in role_counts.index[:10]:  # top 10 roles
    if role in role_skill_map:
        top5 = role_skill_map[role].most_common(5)
        skills_str = ", ".join([f"{s}({c})" for s, c in top5])
        print(f"  {role:35s} → {skills_str}")


# ── 5. SUMMARY TABLES ─────────────────────────────────────────────────────
print("\n" + "─" * 60)
print("  TASK 4: Summary Tables")
print("─" * 60)

# 5a. Overall summary
summary = {
    "Total Postings": len(df),
    "Unique Job Titles": df["job_title"].nunique(),
    "Unique Locations": df["location"].nunique(),
    "Postings with Skills Listed": df["skills"].notna().sum(),
    "Unique Skills (Structured)": len(structured_skill_counts),
    "Unique Skills (NLP-extracted)": len(nlp_skill_counts),
    "Top Role Category": role_counts.index[0],
    "Top Skill": top_skills[0][0],
    "Top Region": region_counts.index[0],
    "Most Common Experience": exp_counts.idxmax(),
}

print("\n OVERALL SUMMARY:\n")
for key, val in summary.items():
    print(f"  {key:40s}: {val}")

summary_df = pd.DataFrame(list(summary.items()), columns=["Metric", "Value"])
summary_df.to_csv(os.path.join(OUTPUT_DIR, "overall_summary.csv"), index=False)

# 5b. Role x Experience cross-tab
role_exp_crosstab = pd.crosstab(df["role_category"], df["experience_level"])
role_exp_crosstab = role_exp_crosstab.reindex(columns=exp_order, fill_value=0)
role_exp_crosstab.to_csv(os.path.join(OUTPUT_DIR, "role_experience_crosstab.csv"))
print("\n Role × Experience Cross-Tab saved to output/role_experience_crosstab.csv")

# 5c. Region x Role cross-tab
region_role_crosstab = pd.crosstab(df["region"], df["role_category"])
region_role_crosstab.to_csv(os.path.join(OUTPUT_DIR, "region_role_crosstab.csv"))
print(" Region × Role Cross-Tab saved to output/region_role_crosstab.csv")


# ── 6. VISUALIZATIONS ─────────────────────────────────────────────────────
print("\n" + "─" * 60)
print("  TASK 5: Generating Visualizations")
print("─" * 60)

# Style
plt.style.use("seaborn-v0_8-darkgrid")
COLORS = sns.color_palette("viridis", 20)

# 6a. Top 15 Skills — Horizontal Bar Chart
fig, ax = plt.subplots(figsize=(12, 7))
top15 = combined_counts.most_common(15)
skills_names = [s[0].upper() for s in top15][::-1]
skills_vals = [s[1] for s in top15][::-1]
bars = ax.barh(skills_names, skills_vals, color=sns.color_palette("rocket", 15)[::-1], edgecolor="white", linewidth=0.5)
ax.set_xlabel("Number of Mentions", fontsize=12)
ax.set_title("Top 15 In-Demand Skills in AI/Data Job Market", fontsize=15, fontweight="bold", pad=15)
for bar, val in zip(bars, skills_vals):
    ax.text(bar.get_width() + 3, bar.get_y() + bar.get_height()/2, str(val),
            va="center", fontsize=10, fontweight="bold")
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "top_skills_bar.png"), dpi=150, bbox_inches="tight")
plt.close()
print(" top_skills_bar.png")

# 6b. Top Roles — Pie Chart
fig, ax = plt.subplots(figsize=(10, 8))
top_roles = role_counts.head(8)
other_count = role_counts.iloc[8:].sum()
pie_data = pd.concat([top_roles, pd.Series({"Other": other_count})])
colors_pie = sns.color_palette("Set2", len(pie_data))
wedges, texts, autotexts = ax.pie(  # type: ignore
    pie_data.values, labels=pie_data.index, autopct="%1.1f%%",
    colors=colors_pie, pctdistance=0.82, startangle=140,
    wedgeprops=dict(width=0.55, edgecolor="white", linewidth=2)
)
for t in autotexts:
    t.set_fontsize(9)
    t.set_fontweight("bold")
ax.set_title("Job Market Distribution by Role Category", fontsize=14, fontweight="bold", pad=20)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "top_roles_donut.png"), dpi=150, bbox_inches="tight")
plt.close()
print(" top_roles_donut.png")

# 6c. Experience Level Distribution — Bar Chart
fig, ax = plt.subplots(figsize=(10, 6))
exp_plot = exp_counts[exp_counts > 0]
colors_exp = sns.color_palette("mako", len(exp_plot))
bars = ax.bar(range(len(exp_plot)), exp_plot.values, color=colors_exp, edgecolor="white", linewidth=0.5)
ax.set_xticks(range(len(exp_plot)))
ax.set_xticklabels(exp_plot.index, rotation=30, ha="right", fontsize=10)
ax.set_ylabel("Number of Postings", fontsize=12)
ax.set_title("Demand by Experience Level", fontsize=14, fontweight="bold", pad=15)
for bar, val in zip(bars, exp_plot.values):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 3, str(val),
            ha="center", fontsize=10, fontweight="bold")
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "experience_distribution.png"), dpi=150, bbox_inches="tight")
plt.close()
print(" experience_distribution.png")

# 6d. Top 10 Regions — Horizontal Bar
fig, ax = plt.subplots(figsize=(10, 6))
top10_regions = region_counts.head(10)
colors_reg = sns.color_palette("flare", 10)[::-1]
ax.barh(top10_regions.index[::-1], top10_regions.values[::-1], color=colors_reg, edgecolor="white")
ax.set_xlabel("Number of Postings", fontsize=12)
ax.set_title("Top 10 Regions by Job Postings", fontsize=14, fontweight="bold", pad=15)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "top_regions.png"), dpi=150, bbox_inches="tight")
plt.close()
print(" top_regions.png")

# 6e. Skills Word Cloud
fig, ax = plt.subplots(figsize=(14, 7))
wc = WordCloud(
    width=1400, height=700, background_color="white",
    colormap="viridis", max_words=80, max_font_size=120,
    prefer_horizontal=0.7, relative_scaling=0.5
)
wc.generate_from_frequencies(combined_counts)
ax.imshow(wc, interpolation="bilinear")
ax.axis("off")
ax.set_title("Skills Word Cloud — AI/Data Job Market", fontsize=16, fontweight="bold", pad=15)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "skills_wordcloud.png"), dpi=150, bbox_inches="tight")
plt.close()
print(" skills_wordcloud.png")

# 6f. Heatmap: Top Roles × Experience Level
fig, ax = plt.subplots(figsize=(14, 8))
heatmap_data = role_exp_crosstab.loc[role_counts.head(10).index]
heatmap_data = heatmap_data.reindex(columns=[c for c in exp_order if c in heatmap_data.columns])
sns.heatmap(heatmap_data, annot=True, fmt="d", cmap="YlOrRd", linewidths=0.5,
            ax=ax, cbar_kws={"label": "Number of Postings"})
ax.set_title("Top Roles × Experience Level Heatmap", fontsize=14, fontweight="bold", pad=15)
ax.set_ylabel("")
ax.set_xlabel("")
plt.xticks(rotation=30, ha="right")
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "role_experience_heatmap.png"), dpi=150, bbox_inches="tight")
plt.close()
print(" role_experience_heatmap.png")

# 6g. Stacked bar: Top 5 roles skill composition
fig, ax = plt.subplots(figsize=(14, 7))
top5_roles = role_counts.head(5).index.tolist()
# Get top 8 skills overall
top8_skills = [s for s, _ in combined_counts.most_common(8)]
skill_role_data = []
for role in top5_roles:
    if role in role_skill_map:
        row = {"Role": role}
        for skill in top8_skills:
            row[skill] = role_skill_map[role].get(skill, 0)
        skill_role_data.append(row)
skill_role_df = pd.DataFrame(skill_role_data).set_index("Role")
skill_role_df.plot(kind="bar", stacked=True, ax=ax, colormap="Set3", edgecolor="white", linewidth=0.5)
ax.set_title("Top 5 Roles — Skill Composition (Top 8 Skills)", fontsize=14, fontweight="bold", pad=15)
ax.set_ylabel("Skill Mentions", fontsize=12)
ax.set_xlabel("")
ax.legend(bbox_to_anchor=(1.02, 1), loc="upper left", fontsize=9)
plt.xticks(rotation=25, ha="right")
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "role_skill_composition.png"), dpi=150, bbox_inches="tight")
plt.close()
print(" role_skill_composition.png")


# ── 7. SAVE ENRICHED DATA ─────────────────────────────────────────────────
df["nlp_extracted_skills"] = nlp_skill_series.apply(lambda x: ", ".join(x) if isinstance(x, list) else "")
df.to_csv(os.path.join(OUTPUT_DIR, "enriched_job_postings.csv"), index=False)
print(f"\n Enriched dataset saved to {OUTPUT_DIR}/enriched_job_postings.csv")


# ── DONE ───────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print(" ANALYSIS COMPLETE — All outputs saved to ./output/")
print("=" * 60)
print(f"""
Generated files:
   top_skills.csv                  — Ranked skill table
   top_roles.csv                   — Role category counts
   overall_summary.csv             — Key metrics summary
   role_experience_crosstab.csv    — Role × Experience pivot
   region_role_crosstab.csv        — Region × Role pivot
   enriched_job_postings.csv       — Full dataset + NLP skills
    top_skills_bar.png              — Top 15 skills bar chart
    top_roles_donut.png             — Role distribution donut
    experience_distribution.png     — Experience level chart
    top_regions.png                 — Regional demand chart
    skills_wordcloud.png            — Skills word cloud
    role_experience_heatmap.png     — Heatmap: roles × experience
    role_skill_composition.png      — Stacked bar: skills per role
""")
