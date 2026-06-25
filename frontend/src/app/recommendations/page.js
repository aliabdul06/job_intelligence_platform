'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import JobCard from '@/components/JobCard';
import { SkeletonCard, SkeletonBar } from '@/components/LoadingSkeleton';
import styles from './page.module.css';

export default function RecommendationsPage() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();

  // Data states
  const [recommendations, setRecommendations] = useState([]);
  const [skillsGap, setSkillsGap] = useState([]);
  const [hasProfileInfo, setHasProfileInfo] = useState(true);
  
  // Fetch states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/recommendations');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchRecommendations() {
      setLoading(true);
      try {
        const [recsData, gapData] = await Promise.all([
          api.getRecommendations(15),
          api.getSkillsGap(10),
        ]);

        setRecommendations(recsData.recommendations || []);
        setSkillsGap(gapData.skills_gap || []);
        
        const skillsCount = recsData.user_skills?.length || 0;
        const rolesCount = recsData.user_desired_roles?.length || 0;
        
        // If user has no skills and no roles, count as empty profile
        if (skillsCount === 0 && rolesCount === 0) {
          setHasProfileInfo(false);
        } else {
          setHasProfileInfo(true);
        }
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [isAuthenticated]);

  if (authLoading || (isAuthenticated && loading)) {
    return (
      <div className={`container ${styles.container}`}>
        <h1 className="section-title">Smart Recommendations</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginTop: '20px' }}>
          <div>
            <SkeletonCard count={3} />
          </div>
          <div className="glass-card" style={{ padding: '20px' }}>
            <SkeletonBar count={5} />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (error) {
    return (
      <div className={`container ${styles.container}`}>
        <div className={styles.errorCard}>
          <span className={styles.errorIcon}>⚠</span>
          <h3>Failed to calculate recommendations</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const maxGapMentions = skillsGap.length > 0 ? skillsGap[0].market_mentions : 1;

  return (
    <div className={`container ${styles.container}`}>
      <header className={styles.header}>
        <h1 className="section-title">Personalized <span className="accent-text">Recommendations</span></h1>
        <p className="section-subtitle">
          Advanced algorithmic recommendations scored against your skills overlap, role category, experience history, and location.
        </p>
      </header>

      {!hasProfileInfo ? (
        <div className={`${styles.setupPrompt} glass-card`}>
          <span className={styles.setupIcon}>⚡</span>
          <h2>Optimize Your Job Matching</h2>
          <p>
            Your profile currently has no skills or desired roles configured. Add them now to configure the match-score engine and see tailored job matches.
          </p>
          <Link href="/profile" className="btn-primary">
            Complete Profile Now
          </Link>
        </div>
      ) : (
        <div className={styles.layout}>
          {/* Recommendations List */}
          <main className={styles.recommendationsList}>
            <h2>Tailored Job Postings</h2>
            
            {recommendations.length === 0 ? (
              <div className={`${styles.emptyRecs} glass-card`}>
                <h3>No strong matches found</h3>
                <p>Try expanding your profile skills, experience, or desired roles to find more job postings.</p>
                <Link href="/profile" className="btn-secondary" style={{ marginTop: '10px' }}>
                  Edit Profile
                </Link>
              </div>
            ) : (
              <div className={styles.grid}>
                {recommendations.map((job) => (
                  <JobCard key={job._id || job.id} job={job} showScore={true} />
                ))}
              </div>
            )}
          </main>

          {/* Skills Gap Analysis */}
          <aside className={styles.skillsGapSection}>
            <div className={`${styles.gapCard} glass-card`}>
              <h2>Skills Gap Analysis</h2>
              <p className={styles.gapDescription}>
                Here are highly demanded market skills missing from your profile. Acquiring these can boost your compatibility scores.
              </p>

              {skillsGap.length === 0 ? (
                <p className={styles.noGap}>You have all popular market skills! Fantastic job.</p>
              ) : (
                <div className={styles.gapList}>
                  {skillsGap.map((item, idx) => {
                    const fillPct = (item.market_mentions / maxGapMentions) * 100;
                    
                    // Relevance badge mapping
                    let badgeClass = 'badge-blue';
                    if (item.relevance === 'high') badgeClass = 'badge-rose';
                    else if (item.relevance === 'medium') badgeClass = 'badge-amber';

                    return (
                      <div key={idx} className={styles.gapItem}>
                        <div className={styles.gapHeader}>
                          <span className={styles.gapSkill}>{item.skill}</span>
                          <span className={`badge ${badgeClass} ${styles.badge}`}>
                            {item.relevance} priority
                          </span>
                        </div>
                        <div className={styles.mentionsRow}>
                          <span className={styles.mentionsVal}>{item.market_mentions} market mentions</span>
                          <div className={styles.gapBar}>
                            <div className={styles.gapFill} style={{ width: `${fillPct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
