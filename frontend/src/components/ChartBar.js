import styles from './ChartBar.module.css';

export default function ChartBar({ label, value, maxValue, color = 'blue', index = 0, suffix = '' }) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className={styles.row} style={{ animationDelay: `${index * 50}ms` }}>
      <div className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>
          {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </span>
      </div>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${styles[color]}`}
          style={{ width: `${percentage}%`, animationDelay: `${index * 50 + 200}ms` }}
        />
      </div>
    </div>
  );
}
