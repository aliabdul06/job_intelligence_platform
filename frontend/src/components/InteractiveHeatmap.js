'use client';

import { useState, useEffect } from 'react';
import styles from './InteractiveHeatmap.module.css';

export default function InteractiveHeatmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchHeatmapData() {
      try {
        const res = await fetch('/api/crosstab');
        if (!res.ok) throw new Error('Failed to load correlation data');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchHeatmapData();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className="shimmer" style={{ height: '40px', width: '250px', marginBottom: '20px', borderRadius: '4px' }} />
        <div className="shimmer" style={{ height: '300px', width: '100%', borderRadius: '8px' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.errorState}>
        <span className={styles.errorIcon}>⚠</span>
        <p>{error || 'Unable to load correlation heatmap data.'}</p>
      </div>
    );
  }

  const { experienceLevels, rows, maxVal } = data;

  // Filter rows based on search
  const filteredRows = rows.filter(row =>
    row.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.controlsRow}>
        <span className={styles.legendLabel}>Intensity: </span>
        <div className={styles.legendBar}>
          <span>0</span>
          <div className={styles.legendColor} />
          <span>{maxVal}</span>
        </div>
        <input
          type="text"
          placeholder="Filter roles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`input-field ${styles.searchInput}`}
        />
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.heatmapTable}>
          <thead>
            <tr>
              <th className={styles.roleHeaderColumn}>Role Category</th>
              {experienceLevels.map((lvl, idx) => (
                <th key={idx} className={styles.expHeaderColumn}>
                  {lvl.replace(' (Unspecified)', '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td className={styles.roleCell}>{row.role}</td>
                {row.cells.map((cell, cellIdx) => {
                  const opacity = maxVal > 0 ? cell.count / maxVal : 0;
                  // Use opacity to indicate intensity within the purple and white palette.
                  const cellStyle = {
                    background: opacity > 0
                      ? `rgba(147, 51, 234, ${0.1 + opacity * 0.9})`
                      : 'rgba(255, 255, 255, 0.02)',
                    boxShadow: opacity > 0.6
                      ? 'inset 0 0 10px rgba(147, 51, 234, 0.25)'
                      : 'none',
                    border: opacity > 0.8
                      ? '1px solid rgba(147, 51, 234, 0.5)'
                      : '1px solid rgba(255, 255, 255, 0.03)'
                  };

                  return (
                    <td
                      key={cellIdx}
                      style={cellStyle}
                      className={styles.heatmapCell}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCell({
                          role: row.role,
                          experience: cell.experience,
                          count: cell.count,
                          x: rect.left + window.scrollX + rect.width / 2,
                          y: rect.top + window.scrollY - 80
                        });
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <span className={styles.cellVal}>{cell.count}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Custom Tooltip */}
      {hoveredCell && (
        <div
          className={`${styles.tooltip} glass-card`}
          style={{
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y}px`,
          }}
        >
          <div className={styles.tooltipRole}>{hoveredCell.role}</div>
          <div className={styles.tooltipDetails}>
            <span>Exp: {hoveredCell.experience.replace(' (Unspecified)', '')}</span>
            <strong className={styles.tooltipCount}>{hoveredCell.count} postings</strong>
          </div>
        </div>
      )}
    </div>
  );
}
