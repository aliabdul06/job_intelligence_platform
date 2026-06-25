import Link from 'next/link';
import styles from './JobCard.module.css';

export default function JobCard({ job, showScore = false }) {
  const skills = job.skills || [];
  const displaySkills = skills.slice(0, 5);
  const moreCount = skills.length - displaySkills.length;

  return (
    <Link href={`/jobs/${job._id || job.id}`} className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{job.job_title}</h3>
        {showScore && job.match_score !== undefined && (
          <div className={styles.score}>
            <svg className={styles.scoreRing} viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(147, 51, 234, 0.15)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.915"
                fill="none"
                stroke="var(--accent-blue)"
                strokeWidth="3"
                strokeDasharray={`${job.match_score} ${100 - job.match_score}`}
                strokeDashoffset="25"
                strokeLinecap="round"
              />
            </svg>
            <span className={styles.scoreText}>{Math.round(job.match_score)}%</span>
          </div>
        )}
      </div>

      <div className={styles.meta}>
        {job.role_category && (
          <span className={`badge badge-blue`}>{job.role_category}</span>
        )}
        {job.experience_level && (
          <span className={`badge badge-violet`}>{job.experience_level}</span>
        )}
      </div>

      <div className={styles.details}>
        {job.location && (
          <span className={styles.detail}>
            <span className={styles.detailIcon}>📍</span>
            {job.location}
          </span>
        )}
        {job.region && (
          <span className={styles.detail}>
            <span className={styles.detailIcon}>🌍</span>
            {job.region}
          </span>
        )}
      </div>

      {displaySkills.length > 0 && (
        <div className={styles.skills}>
          {displaySkills.map((skill, i) => (
            <span key={i} className={styles.skillTag}>{skill}</span>
          ))}
          {moreCount > 0 && (
            <span className={styles.moreTag}>+{moreCount}</span>
          )}
        </div>
      )}

      <div className={styles.arrow}>→</div>
    </Link>
  );
}
