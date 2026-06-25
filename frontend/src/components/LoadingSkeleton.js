import styles from './LoadingSkeleton.module.css';

export function SkeletonCard({ count = 1 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className={styles.card}>
      <div className={`${styles.shimmer} ${styles.titleLine}`}></div>
      <div className={`${styles.shimmer} ${styles.metaLine}`}></div>
      <div className={styles.tagRow}>
        <div className={`${styles.shimmer} ${styles.tag}`}></div>
        <div className={`${styles.shimmer} ${styles.tag}`}></div>
        <div className={`${styles.shimmer} ${styles.tag}`}></div>
      </div>
    </div>
  ));
}

export function SkeletonBar({ count = 5 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className={styles.barRow}>
      <div className={styles.barLabel}>
        <div className={`${styles.shimmer} ${styles.barLabelLine}`}></div>
        <div className={`${styles.shimmer} ${styles.barValueLine}`}></div>
      </div>
      <div className={`${styles.shimmer} ${styles.bar}`}></div>
    </div>
  ));
}

export function SkeletonStat({ count = 4 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className={styles.statCard}>
      <div className={`${styles.shimmer} ${styles.statIcon}`}></div>
      <div className={styles.statContent}>
        <div className={`${styles.shimmer} ${styles.statValue}`}></div>
        <div className={`${styles.shimmer} ${styles.statLabel}`}></div>
      </div>
    </div>
  ));
}
