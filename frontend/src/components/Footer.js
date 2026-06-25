import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <span className={styles.logo}>
            <span className={styles.logoIcon}>⬡</span>
            Job<span className={styles.accent}>Intel</span>
          </span>
          <p className={styles.tagline}>
            AI-powered job market intelligence platform
          </p>
        </div>
        <div className={styles.links}>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkTitle}>Platform</h4>
            <Link href="/">Dashboard</Link>
            <Link href="/jobs">Browse Jobs</Link>
            <Link href="/search">Search</Link>
          </div>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkTitle}>Analytics</h4>
            <Link href="/skills">Skills</Link>
            <Link href="/regions">Regions</Link>
            <Link href="/recommendations">Recommendations</Link>
          </div>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkTitle}>Account</h4>
            <Link href="/login">Sign In</Link>
            <Link href="/register">Get Started</Link>
            <Link href="/profile">Profile</Link>
          </div>
        </div>
        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} JobIntel. Built with Next.js & FastAPI.</p>
        </div>
      </div>
    </footer>
  );
}
