'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import StatCard from '@/components/StatCard';
import ChartBar from '@/components/ChartBar';
import JobCard from '@/components/JobCard';
import { SkeletonStat, SkeletonBar, SkeletonCard } from '@/components/LoadingSkeleton';
import styles from './page.module.css';

export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chart toggles for advanced PNG visual integrations
  const [skillView, setSkillView] = useState('interactive');
  const [roleView, setRoleView] = useState('interactive');
  const [experienceView, setExperienceView] = useState('interactive');
  const [regionView, setRegionView] = useState('interactive');

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await api.getHomepage(15, 6);
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (error) {
    return (
      <div className={styles.errorWrap}>
        <div className={styles.errorCard}>
          <span className={styles.errorIcon}>⚠</span>
          <h2>Unable to load dashboard</h2>
          <p>{error}</p>
          <p className={styles.errorHint}>Make sure the backend server is running on <code>http://localhost:8000</code></p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const topSkills = data?.top_skills || [];
  const topRoles = data?.top_roles || [];
  const experienceDist = data?.experience_distribution || [];
  const topRegions = data?.top_regions || [];
  const latestJobs = data?.latest_jobs || [];
  const skillRoleMatrix = data?.skill_role_matrix || [];
  const maxSkillMentions = topSkills.length > 0 ? topSkills[0].mentions : 1;
  const maxRegionCount = topRegions.length > 0 ? topRegions[0].count : 1;

  return (
    <div className={styles.page}>
      {/* ── Hero Section ──────────────────────────────── */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot}></span>
              Latest Market Intelligence
            </div>
            <h1 className={styles.heroTitle}>
              Decode the <span className="accent-text">AI & Data</span> Job Market
            </h1>
            <p className={styles.heroSubtitle}>
              Real-time analytics on skills demand, role distribution, regional trends,
              and personalized career recommendations powered by NLP analysis of thousands of job postings.
            </p>
            <div className={styles.heroCta}>
              <Link href="/search" className="btn-primary">
                ⊕ Explore Jobs
              </Link>
              <Link href="/skills" className="btn-secondary">
                ◐ Skill Trends
              </Link>
            </div>
          </div>
          <div className={styles.heroOrb}></div>
          <div className={styles.heroOrb2}></div>
        </div>
      </section>

      {/* ── Summary Stats ─────────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.statsGrid}>
            {loading ? (
              <SkeletonStat count={4} />
            ) : (
              <>
                <StatCard
                  label="Total Job Postings"
                  value={summary.total_postings || 0}
                  icon="📊"
                  color="blue"
                  delay={0}
                />
                <StatCard
                  label="Unique Skills Tracked"
                  value={summary.unique_skills || 0}
                  icon="🔧"
                  color="cyan"
                  delay={100}
                />
                <StatCard
                  label="Top Role Category"
                  value={summary.top_role || '—'}
                  icon="👤"
                  color="violet"
                  delay={200}
                />
                <StatCard
                  label="Top Region"
                  value={summary.top_region || '—'}
                  icon="🌍"
                  color="emerald"
                  delay={300}
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Top Skills ────────────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className="section-title">
                <span className="accent-text">Top Skills</span> in Demand
              </h2>
              <p className="section-subtitle">Most frequently mentioned skills across all job postings</p>
            </div>
            <div className={styles.controlHeader}>
              <div className={styles.tabHeader}>
                <button
                  onClick={() => setSkillView('interactive')}
                  className={`${styles.tabBtn} ${skillView === 'interactive' ? styles.activeTab : ''}`}
                >
                  Interactive
                </button>
                <button
                  onClick={() => setSkillView('bar')}
                  className={`${styles.tabBtn} ${skillView === 'bar' ? styles.activeTab : ''}`}
                >
                  Prevalence Map
                </button>
                <button
                  onClick={() => setSkillView('composition')}
                  className={`${styles.tabBtn} ${skillView === 'composition' ? styles.activeTab : ''}`}
                >
                  Composition
                </button>
                <button
                  onClick={() => setSkillView('wordcloud')}
                  className={`${styles.tabBtn} ${skillView === 'wordcloud' ? styles.activeTab : ''}`}
                >
                  Word Cloud
                </button>
              </div>
              <Link href="/skills" className="btn-secondary">View All →</Link>
            </div>
          </div>
          <div className={styles.chartCard}>
            {loading ? (
              <div className={styles.barList}><SkeletonBar count={10} /></div>
            ) : skillView === 'interactive' ? (
              <div className={styles.barList}>
                {topSkills.slice(0, 12).map((skill, i) => (
                  <ChartBar
                    key={skill.skill}
                    label={skill.skill}
                    value={skill.mentions}
                    maxValue={maxSkillMentions}
                    color={i % 3 === 0 ? 'blue' : i % 3 === 1 ? 'cyan' : 'violet'}
                    index={i}
                  />
                ))}
              </div>
            ) : skillView === 'wordcloud' ? (
              <div className={styles.imageContainer}>
                <img
                  src="/skills_wordcloud.png"
                  alt="Skills Word Cloud"
                  className={`${styles.chartImage} animate-visual-entrance`}
                />
              </div>
            ) : skillView === 'composition' ? (
              <div className={styles.imageContainer}>
                <img
                  src="/role_skill_composition.png"
                  alt="Role Skill Composition"
                  className={`${styles.chartImage} animate-visual-entrance`}
                />
              </div>
            ) : (
              <div className={styles.imageContainer}>
                <img
                  src="/top_skills_bar.png"
                  alt="Top Skills Market Map"
                  className={`${styles.chartImage} animate-visual-entrance`}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Roles & Experience ────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.twoCol}>
            {/* Roles */}
            <div>
              <div className={styles.cardHeaderWithTabs}>
                <div>
                  <h2 className="section-title">Role Distribution</h2>
                  <p className="section-subtitle">Job categories across the market</p>
                </div>
                <div className={styles.miniTabHeader}>
                  <button
                    onClick={() => setRoleView('interactive')}
                    className={`${styles.miniTabBtn} ${roleView === 'interactive' ? styles.activeMiniTab : ''}`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setRoleView('donut')}
                    className={`${styles.miniTabBtn} ${roleView === 'donut' ? styles.activeMiniTab : ''}`}
                  >
                    Donut Visual
                  </button>
                </div>
              </div>
              <div className={styles.chartCard}>
                {loading ? (
                  <SkeletonBar count={6} />
                ) : roleView === 'interactive' ? (
                  <div className={styles.roleList}>
                    {topRoles.map((role, i) => (
                      <div key={role.role} className={styles.roleItem}>
                        <div className={styles.roleInfo}>
                          <span className={styles.roleName}>{role.role}</span>
                          <span className={styles.roleCount}>
                            {role.count} <span className={styles.rolePercent}>({role.percentage}%)</span>
                          </span>
                        </div>
                        <div className={styles.roleTrack}>
                          <div
                            className={styles.roleFill}
                            style={{
                              width: `${role.percentage}%`,
                              animationDelay: `${i * 60}ms`,
                              background: `hsl(${220 + i * 18}, 70%, 55%)`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.imageContainer}>
                    <img
                      src="/top_roles_donut.png"
                      alt="Roles Donut Chart"
                      className={`${styles.chartImage} animate-visual-entrance`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Experience */}
            <div>
              <div className={styles.cardHeaderWithTabs}>
                <div>
                  <h2 className="section-title">Experience Levels</h2>
                  <p className="section-subtitle">Seniority distribution of postings</p>
                </div>
                <div className={styles.miniTabHeader}>
                  <button
                    onClick={() => setExperienceView('interactive')}
                    className={`${styles.miniTabBtn} ${experienceView === 'interactive' ? styles.activeMiniTab : ''}`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setExperienceView('distribution')}
                    className={`${styles.miniTabBtn} ${experienceView === 'distribution' ? styles.activeMiniTab : ''}`}
                  >
                    Curve Visual
                  </button>
                </div>
              </div>
              <div className={styles.chartCard}>
                {loading ? (
                  <SkeletonBar count={5} />
                ) : experienceView === 'interactive' ? (
                  <div className={styles.expList}>
                    {experienceDist.map((exp, i) => {
                      const colors = ['#9333ea', '#9333ea', '#9333ea', '#9333ea', '#9333ea', '#9333ea', '#9333ea'];
                      return (
                        <div key={exp.level} className={styles.expItem}>
                          <div className={styles.expDot} style={{ background: colors[i % colors.length] }}></div>
                          <div className={styles.expInfo}>
                            <span className={styles.expLevel}>{exp.level}</span>
                            <span className={styles.expCount}>{exp.count} jobs</span>
                          </div>
                          <div className={styles.expBar}>
                            <div
                              className={styles.expFill}
                              style={{
                                width: `${exp.percentage}%`,
                                background: colors[i % colors.length],
                                animationDelay: `${i * 80}ms`,
                              }}
                            />
                          </div>
                          <span className={styles.expPercent}>{exp.percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.imageContainer}>
                    <img
                      src="/experience_distribution.png"
                      alt="Experience Distribution"
                      className={`${styles.chartImage} animate-visual-entrance`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Role & Experience Correlation Heatmap ──────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className="section-title">
                <span className="accent-text">Role & Experience Correlation</span> Map
              </h2>
              <p className="section-subtitle">Correlation density between role categories and seniority requirements</p>
            </div>
          </div>
          <div className={styles.chartCard} style={{ display: 'flex', justifyContent: 'center' }}>
            <div className={styles.heatmapImageContainer}>
              <img
                src="/role_experience_heatmap.png"
                alt="Role Experience Heatmap"
                className={`${styles.heatmapChartImage} animate-visual-entrance`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Top Regions ───────────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className="section-title">
                <span className="accent-text">Top Regions</span>
              </h2>
              <p className="section-subtitle">Where the jobs are concentrated</p>
            </div>
            <div className={styles.controlHeader}>
              <div className={styles.miniTabHeader} style={{ marginRight: '15px' }}>
                <button
                  onClick={() => setRegionView('interactive')}
                  className={`${styles.miniTabBtn} ${regionView === 'interactive' ? styles.activeMiniTab : ''}`}
                >
                  Grid List
                </button>
                <button
                  onClick={() => setRegionView('bar')}
                  className={`${styles.miniTabBtn} ${regionView === 'bar' ? styles.activeMiniTab : ''}`}
                >
                  Density Visual
                </button>
              </div>
              <Link href="/regions" className="btn-secondary">All Regions →</Link>
            </div>
          </div>
          {regionView === 'interactive' ? (
            <div className={styles.regionGrid}>
              {loading ? (
                <SkeletonCard count={6} />
              ) : (
                topRegions.slice(0, 8).map((region, i) => (
                  <Link
                    href={`/regions?selected=${encodeURIComponent(region.region)}`}
                    key={region.region}
                    className={styles.regionCard}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className={styles.regionName}>{region.region}</span>
                    <span className={styles.regionCount}>{region.count.toLocaleString()} jobs</span>
                    <div className={styles.regionBar}>
                      <div
                        className={styles.regionFill}
                        style={{ width: `${(region.count / maxRegionCount) * 100}%` }}
                      />
                    </div>
                  </Link>
                ))
              )}
            </div>
          ) : (
            <div className={styles.chartCard} style={{ display: 'flex', justifyContent: 'center' }}>
              <div className={styles.imageContainer}>
                <img
                  src="/top_regions.png"
                  alt="Top Regions Density Plot"
                  className={`${styles.chartImage} animate-visual-entrance`}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Skill-Role Matrix ─────────────────────────── */}
      {!loading && skillRoleMatrix.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <h2 className="section-title">Skills by Role</h2>
            <p className="section-subtitle" style={{ marginBottom: 'var(--space-xl)' }}>
              Top skills required for each role category
            </p>
            <div className={styles.matrixGrid}>
              {skillRoleMatrix.slice(0, 6).map((item, i) => (
                <div key={item.role} className={styles.matrixCard} style={{ animationDelay: `${i * 70}ms` }}>
                  <h3 className={styles.matrixRole}>{item.role}</h3>
                  <div className={styles.matrixSkills}>
                    {item.skills.map((s) => (
                      <div key={s.skill} className={styles.matrixSkillRow}>
                        <span className={styles.matrixSkillName}>{s.skill}</span>
                        <span className={styles.matrixSkillCount}>{s.mentions}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Latest Jobs ───────────────────────────────── */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className="section-title">Latest Postings</h2>
              <p className="section-subtitle">Recently added job opportunities</p>
            </div>
            <Link href="/jobs" className="btn-secondary">Browse All →</Link>
          </div>
          <div className={styles.jobGrid}>
            {loading ? (
              <SkeletonCard count={6} />
            ) : (
              latestJobs.map((job) => (
                <JobCard key={job.id} job={{ ...job, _id: job.id }} />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
