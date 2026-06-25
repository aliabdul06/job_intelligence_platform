'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import ChartBar from '@/components/ChartBar';
import { SkeletonBar, SkeletonCard } from '@/components/LoadingSkeleton';
import styles from './page.module.css';

export default function RegionsPage() {
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regionStats, setRegionStats] = useState(null);
  const [viewType, setViewType] = useState('details'); // details or map
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchRegions() {
      try {
        const res = await api.getTopRegions(15);
        const regionList = res.top_regions || [];
        setRegions(regionList);
        
        // Select first region by default
        if (regionList.length > 0) {
          handleRegionSelect(regionList[0].region);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRegions();
  }, []);

  const handleRegionSelect = async (regionName) => {
    setSelectedRegion(regionName);
    setLoadingStats(true);
    try {
      const stats = await api.getRegionStats(regionName);
      setRegionStats(stats);
    } catch (err) {
      console.error('Failed to fetch stats for region:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading) {
    return (
      <div className={`container ${styles.container}`}>
        <h1 className="section-title">Regions Analytics</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', marginTop: '20px' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <SkeletonCard count={3} />
          </div>
          <div className="glass-card" style={{ padding: '20px' }}>
            <SkeletonBar count={5} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`container ${styles.container}`}>
        <div className={styles.errorCard}>
          <span className={styles.errorIcon}>⚠</span>
          <h3>Error loading regions</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const maxJobsRegion = regions.length > 0 ? regions[0].count : 1;
  const maxRoleCount = regionStats?.top_roles?.length > 0 ? regionStats.top_roles[0].count : 1;
  const maxSkillMentions = regionStats?.top_skills?.length > 0 ? regionStats.top_skills[0].mentions : 1;

  return (
    <div className={`container ${styles.container}`}>
      <header className={styles.header}>
        <div className={styles.headerTitleRow}>
          <div>
            <h1 className="section-title">Geographical <span className="accent-text">Region Intelligence</span></h1>
            <p className="section-subtitle">
              Examine job distributions by geographic regions, inspect popular jobs, local skill requirements, and average experience constraints.
            </p>
          </div>
          <div className={styles.tabHeader}>
            <button
              onClick={() => setViewType('details')}
              className={`${styles.tabBtn} ${viewType === 'details' ? styles.activeTab : ''}`}
            >
              Details Explorer
            </button>
            <button
              onClick={() => setViewType('map')}
              className={`${styles.tabBtn} ${viewType === 'map' ? styles.activeTab : ''}`}
            >
              Visual Density Map
            </button>
          </div>
        </div>
      </header>

      {viewType === 'map' ? (
        <div className={`${styles.chartCard} glass-card`} style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
          <div className={styles.imageContainer}>
            <img
              src="/top_regions.png"
              alt="Geographical Regional Density Plot"
              className={`${styles.chartImage} animate-visual-entrance`}
            />
          </div>
        </div>
      ) : (
        <div className={styles.layout}>
          {/* Regions Grid List */}
          <aside className={styles.regionsGrid}>
            <h2>Top Regions</h2>
            <div className={styles.grid}>
              {regions.map((reg, i) => {
                const isSelected = selectedRegion === reg.region;
                const fillPct = (reg.count / maxJobsRegion) * 100;
                
                return (
                  <button
                    key={i}
                    onClick={() => handleRegionSelect(reg.region)}
                    className={`${styles.regionCard} glass-card ${isSelected ? styles.selectedCard : ''}`}
                  >
                    <div className={styles.cardHeader}>
                      <span className={styles.pin}>📍</span>
                      <span className={styles.name}>{reg.region}</span>
                    </div>
                    <div className={styles.countRow}>
                      <span className={styles.countVal}>{reg.count} postings</span>
                      <div className={styles.miniBar}>
                        <div className={styles.miniFill} style={{ width: `${fillPct}%` }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Region Stats Detail Panel */}
          <main className={styles.detailsPanel}>
            {loadingStats ? (
              <div className={`${styles.statsCard} glass-card`}>
                <div style={{ padding: '20px' }}>
                  <h3>Loading geographical statistics...</h3>
                  <SkeletonBar count={5} />
                </div>
              </div>
            ) : regionStats ? (
              <div className={`${styles.statsCard} glass-card`}>
                <header className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelLabel}>REGION DETAILS</span>
                    <h2 className={styles.panelTitle}>{regionStats.region}</h2>
                  </div>
                  <div className={styles.totalBadge}>
                    <strong>{regionStats.total_jobs}</strong> total jobs
                  </div>
                </header>

                <div className={styles.panelGrids}>
                  {/* Top Roles */}
                  <div className={styles.statsSection}>
                    <h3>🏢 Top Job Categories</h3>
                    <div className={styles.list}>
                      {regionStats.top_roles && regionStats.top_roles.length > 0 ? (
                        regionStats.top_roles.map((item, idx) => (
                          <ChartBar
                            key={idx}
                            label={item.role}
                            value={item.count}
                            maxValue={maxRoleCount}
                            index={idx}
                            suffix=" jobs"
                            color="blue"
                          />
                        ))
                      ) : (
                        <p className={styles.noData}>No data available.</p>
                      )}
                    </div>
                  </div>

                  {/* Experience distribution */}
                  <div className={styles.statsSection}>
                    <h3>🎓 Experience Profile</h3>
                    <div className={styles.list}>
                      {regionStats.experience_distribution && regionStats.experience_distribution.length > 0 ? (
                        regionStats.experience_distribution.map((item, idx) => {
                          const total = regionStats.experience_distribution.reduce((acc, current) => acc + current.count, 0);
                          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                          return (
                            <div key={idx} className={styles.expRow}>
                              <span className={styles.expLevel}>{item.level}</span>
                              <div className={styles.expBar}>
                                <div className={styles.expFill} style={{ width: `${pct}%` }} />
                              </div>
                              <span className={styles.expPct}>{pct}% ({item.count})</span>
                            </div>
                          );
                        })
                      ) : (
                        <p className={styles.noData}>No data available.</p>
                      )}
                    </div>
                  </div>

                  {/* Top Skills */}
                  <div className={`${styles.statsSection} ${styles.fullWidth}`}>
                    <h3>🛠 Highly Demanded Skills</h3>
                    <div className={styles.skillsInspector}>
                      {regionStats.top_skills && regionStats.top_skills.length > 0 ? (
                        regionStats.top_skills.map((item, idx) => (
                          <ChartBar
                            key={idx}
                            label={item.skill}
                            value={item.mentions}
                            maxValue={maxSkillMentions}
                            index={idx}
                            suffix=" mentions"
                            color="violet"
                          />
                        ))
                      ) : (
                        <p className={styles.noData}>No data available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`${styles.selectPrompt} glass-card`}>
                <span className={styles.promptIcon}>🗺</span>
                <h3>Select a Region</h3>
                <p>Click a region card on the left panel to load geographical job market statistics.</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
