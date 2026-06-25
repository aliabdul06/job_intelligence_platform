'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import JobCard from '@/components/JobCard';
import { SkeletonCard } from '@/components/LoadingSkeleton';
import styles from './page.module.css';

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [job, setJob] = useState(null);
  const [relatedJobs, setRelatedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    async function fetchJobDetails() {
      setLoading(true);
      try {
        const jobData = await api.getJob(id);
        setJob(jobData);
        setError(null);
        
        // Fetch related jobs based on same role category
        if (jobData.role_category) {
          setLoadingRelated(true);
          try {
            const related = await api.getJobs({
              page: 1,
              pageSize: 4,
              role: jobData.role_category,
            });
            // Filter out current job
            const filtered = (related.jobs || []).filter(j => (j._id || j.id) !== id);
            setRelatedJobs(filtered.slice(0, 3));
          } catch (rErr) {
            console.error('Failed to load related jobs:', rErr);
          } finally {
            setLoadingRelated(false);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchJobDetails();
  }, [id]);

  if (loading) {
    return (
      <div className={`container ${styles.container}`}>
        <div className={styles.loadingState}>
          <div className="shimmer" style={{ height: '40px', width: '300px', marginBottom: '20px', borderRadius: '4px' }} />
          <div className="shimmer" style={{ height: '20px', width: '200px', marginBottom: '40px', borderRadius: '4px' }} />
          <div className="shimmer" style={{ height: '300px', width: '100%', borderRadius: '8px' }} />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className={`container ${styles.container}`}>
        <div className={styles.errorCard}>
          <span className={styles.errorIcon}>⚠</span>
          <h3>Job Not Found</h3>
          <p>{error || 'The job posting you are looking for does not exist or has been removed.'}</p>
          <button onClick={() => router.push('/jobs')} className="btn-primary" style={{ marginTop: '20px' }}>
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${styles.container}`}>
      {/* Back navigation */}
      <button onClick={() => router.back()} className={styles.backBtn}>
        ← Back to Listings
      </button>

      <div className={styles.layout}>
        {/* Main Job Body */}
        <main className={styles.main}>
          <div className={`${styles.headerCard} glass-card`}>
            <div className={styles.headerTop}>
              <h1 className={styles.title}>{job.job_title}</h1>
              {job.match_score !== undefined && (
                <div className={styles.matchBadge}>
                  <span className={styles.matchLabel}>Match Score</span>
                  <span className={styles.matchVal}>{Math.round(job.match_score)}%</span>
                </div>
              )}
            </div>

            <div className={styles.meta}>
              {job.role_category && (
                <span className="badge badge-blue">{job.role_category}</span>
              )}
              {job.experience_level && (
                <span className="badge badge-violet">{job.experience_level}</span>
              )}
              {job.location && (
                <span className={styles.metaItem}>📍 {job.location}</span>
              )}
              {job.region && (
                <span className={styles.metaItem}>🌍 {job.region}</span>
              )}
            </div>

            {/* CTA action buttons */}
            <div className={styles.actions}>
              {job.job_url ? (
                <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  Apply Now ↗
                </a>
              ) : (
                <button className="btn-primary" disabled>Apply via Platform</button>
              )}
              
              {!isAuthenticated && (
                <Link href="/login" className="btn-secondary">
                  Login for Smart Match Analysis
                </Link>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div className={`${styles.descriptionCard} glass-card`}>
            <h2 className={styles.sectionTitle}>Job Description</h2>
            <div className={styles.descriptionContent}>
              {job.description ? (
                job.description.split('\n').map((para, i) => (
                  <p key={i}>{para || '\u00a0'}</p>
                ))
              ) : (
                <p className={styles.noDescription}>No detailed description was provided for this job listing.</p>
              )}
            </div>
          </div>
        </main>

        {/* Sidebar Info */}
        <aside className={styles.sidebar}>
          <div className={`${styles.skillsCard} glass-card`}>
            <h3>Required Skills</h3>
            {job.skills && job.skills.length > 0 ? (
              <div className={styles.skillsGrid}>
                {job.skills.map((skill, i) => (
                  <span key={i} className={styles.skillTag}>{skill}</span>
                ))}
              </div>
            ) : (
              <p className={styles.noSkills}>No specific skills listed.</p>
            )}
          </div>

          {/* Related Jobs */}
          <div className={styles.relatedSection}>
            <h3>Related Openings</h3>
            {loadingRelated ? (
              <div style={{ marginTop: '10px' }}>
                <SkeletonCard count={2} />
              </div>
            ) : relatedJobs.length > 0 ? (
              <div className={styles.relatedGrid}>
                {relatedJobs.map((rJob) => (
                  <JobCard key={rJob._id || rJob.id} job={rJob} />
                ))}
              </div>
            ) : (
              <p className={styles.noRelated}>No related jobs found in this category.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
