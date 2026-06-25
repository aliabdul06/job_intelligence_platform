'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard', icon: '◈' },
  { href: '/jobs', label: 'Jobs', icon: '◆' },
  { href: '/search', label: 'Search', icon: '⊕' },
  { href: '/skills', label: 'Skills', icon: '◐' },
  { href: '/regions', label: 'Regions', icon: '◎' },
];

const AUTH_LINKS = [
  { href: '/recommendations', label: 'For You', icon: '★' },
  { href: '/profile', label: 'Profile', icon: '◉' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={styles.logoText}>
            Job<span className={styles.logoAccent}>Intel</span>
          </span>
        </Link>

        <div className={`${styles.navLinks} ${mobileOpen ? styles.mobileOpen : ''}`}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{link.icon}</span>
              {link.label}
            </Link>
          ))}

          {isAuthenticated && AUTH_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>

        <div className={styles.authArea}>
          {isAuthenticated ? (
            <div className={styles.userMenu}>
              <span className={styles.userName}>{user?.full_name?.split(' ')[0]}</span>
              <button onClick={logout} className={styles.logoutBtn}>Logout</button>
            </div>
          ) : (
            <div className={styles.authButtons}>
              <Link href="/login" className="btn-secondary">Sign In</Link>
              <Link href="/register" className="btn-primary">Get Started</Link>
            </div>
          )}
        </div>

        <button
          className={`${styles.hamburger} ${mobileOpen ? styles.hamburgerOpen : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
}
