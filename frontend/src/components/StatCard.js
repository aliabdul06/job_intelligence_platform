'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './StatCard.module.css';

export default function StatCard({ label, value, icon, color = 'blue', delay = 0 }) {
  const [displayed, setDisplayed] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const numValue = parseInt(value);
    if (isNaN(numValue)) {
      setDisplayed(value);
      return;
    }
    const duration = 1200;
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;
    const increment = numValue / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numValue) {
        setDisplayed(numValue.toLocaleString());
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(current).toLocaleString());
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [visible, value]);

  return (
    <div
      ref={ref}
      className={`${styles.card} ${styles[color]} ${visible ? styles.visible : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.iconWrap}>
        <span className={styles.icon}>{icon}</span>
      </div>
      <div className={styles.content}>
        <span className={styles.value}>{displayed}</span>
        <span className={styles.label}>{label}</span>
      </div>
      <div className={styles.glow}></div>
    </div>
  );
}
