'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import ChartBar from '@/components/ChartBar';
import { SkeletonBar } from '@/components/LoadingSkeleton';
import styles from './page.module.css';

export default function SkillsPage() {
  const [topSkills, setTopSkills] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [roles, setRoles] = useState([]);
  
  // Selection/Search states
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleSkills, setRoleSkills] = useState([]);
  const [loadingRoleSkills, setLoadingRoleSkills] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [distPage, setDistPage] = useState(1);
  const distPageSize = 8;
  const [skillView, setSkillView] = useState('interactive');

  // Main fetch states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSkillsData() {
      try {
        const [topData, distData, rolesData] = await Promise.all([
          api.getTopSkills(10),
          api.getSkillDistribution(),
          api.getSkillsByRole(),
        ]);
        
        setTopSkills(topData.top_skills || []);
        setDistribution(distData.distribution || []);
        
        const rolesList = rolesData.skills_by_role || [];
        setRoles(rolesList);
        
        // Select first role by default
        if (rolesList.length > 0) {
          handleRoleSelect(rolesList[0].role);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSkillsData();
  }, []);

  const handleRoleSelect = async (roleName) => {
    setSelectedRole(roleName);
    setLoadingRoleSkills(true);
    try {
      const details = await api.getSkillsForRole(roleName);
      setRoleSkills(details.skills || []);
    } catch (err) {
      console.error('Failed to load skills for role:', err);
    } finally {
      setLoadingRoleSkills(false);
    }
  };

  // Filter distribution list by search query
  const filteredDistribution = distribution.filter(item =>
    item.skill.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination for distribution table
  const totalPages = Math.ceil(filteredDistribution.length / distPageSize);
  const paginatedDist = filteredDistribution.slice(
    (distPage - 1) * distPageSize,
    distPage * distPageSize
  );

  if (loading) {
    return (
      <div className={`container ${styles.container}`}>
        <h1 className="section-title" style={{ marginBottom: '20px' }}>Skills Analytics</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '20px' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <SkeletonBar count={5} />
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
          <h3>Error loading analytics</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Calculate maximum values for relative chart percentages
  const maxTopMentions = topSkills.length > 0 ? topSkills[0].mentions : 1;
  const maxRoleMentions = roleSkills.length > 0 ? roleSkills[0].mentions : 1;

  return (
    <div className={`container ${styles.container}`}>
      <header className={styles.header}>
        <h1 className="section-title">Job Market <span className="accent-text">Skills Analytics</span></h1>
        <p className="section-subtitle">
          Explore in-demand skills, analyze their distributions, and review skill matrix mapped by role categories.
        </p>
      </header>

      {/* ── Top Demanded Skills ───────────────────────────── */}
      <section className={styles.topSection}>
        <div className={`${styles.chartCard} glass-card`}>
          <div className={styles.cardHeaderWithTabs}>
            <div>
              <h2 className={styles.cardTitle}>🔥 Most In-Demand Skills</h2>
              <p className={styles.cardSubtitle}>Top 10 skills mentioned across all job postings</p>
            </div>
            <div className={styles.tabHeader}>
              <button
                onClick={() => setSkillView('interactive')}
                className={`${styles.tabBtn} ${skillView === 'interactive' ? styles.activeTab : ''}`}
              >
                Interactive
              </button>
              <button
                onClick={() => setSkillView('bar')}
                className={`${styles.tabBtn} ${skillView === 'bar' ? styles.activeTab : ''}`}
              >
                Map
              </button>
              <button
                onClick={() => setSkillView('composition')}
                className={`${styles.tabBtn} ${skillView === 'composition' ? styles.activeTab : ''}`}
              >
                Composition
              </button>
              <button
                onClick={() => setSkillView('wordcloud')}
                className={`${styles.tabBtn} ${skillView === 'wordcloud' ? styles.activeTab : ''}`}
              >
                Cloud
              </button>
            </div>
          </div>
          
          <div className={styles.chartWrapper}>
            {skillView === 'interactive' ? (
              topSkills.map((item, idx) => (
                <ChartBar
                  key={idx}
                  label={item.skill}
                  value={item.mentions}
                  maxValue={maxTopMentions}
                  index={idx}
                  suffix=" mentions"
                  color="blue"
                />
              ))
            ) : skillView === 'wordcloud' ? (
              <div className={styles.imageContainer}>
                <img
                  src="/skills_wordcloud.png"
                  alt="Skills Word Cloud"
                  className={`${styles.chartImage} animate-visual-entrance`}
                />
              </div>
            ) : skillView === 'composition' ? (
              <div className={styles.imageContainer}>
                <img
                  src="/role_skill_composition.png"
                  alt="Role Skill Composition"
                  className={`${styles.chartImage} animate-visual-entrance`}
                />
              </div>
            ) : (
              <div className={styles.imageContainer}>
                <img
                  src="/top_skills_bar.png"
                  alt="Top Skills Prevalence Map"
                  className={`${styles.chartImage} animate-visual-entrance`}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Searchable Skill Distribution Table ─────────────── */}
        <div className={`${styles.tableCard} glass-card`}>
          <div className={styles.tableHeader}>
            <div>
              <h2 className={styles.cardTitle}>📊 Skill Prevalence</h2>
              <p className={styles.cardSubtitle}>Prevalence and ratio of unique skills in postings</p>
            </div>
            <input
              type="text"
              placeholder="Search skill..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDistPage(1); // Reset page on search
              }}
              className={`${styles.searchInput} input-field`}
            />
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Skill</th>
                  <th>Mentions</th>
                  <th>Distribution %</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDist.map((item, idx) => {
                  const globalIdx = distribution.findIndex(d => d.skill === item.skill) + 1;
                  return (
                    <tr key={idx}>
                      <td><span className={styles.rankNum}>#{globalIdx}</span></td>
                      <td className={styles.skillName}>{item.skill}</td>
                      <td>{item.mentions}</td>
                      <td>
                        <div className={styles.progressRow}>
                          <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${item.percentage * 5}%`, maxWidth: '100%' }} />
                          </div>
                          <span className={styles.percentageText}>{item.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div className={styles.tablePagination}>
              <button
                onClick={() => setDistPage(p => Math.max(p - 1, 1))}
                disabled={distPage === 1}
                className={styles.pBtn}
              >
                ◀
              </button>
              <span>Page {distPage} of {totalPages}</span>
              <button
                onClick={() => setDistPage(p => Math.min(p + 1, totalPages))}
                disabled={distPage === totalPages}
                className={styles.pBtn}
              >
                ▶
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Interactive Skills-by-Role Explorer ───────────── */}
      <section className={`${styles.explorerCard} glass-card`}>
        <h2 className={styles.cardTitle}>🎯 Skills Mapped by Role Category</h2>
        <p className={styles.cardSubtitle}>Select a role category to inspect corresponding skill demands</p>

        <div className={styles.explorerLayout}>
          {/* Roles Selector Sidebar */}
          <div className={styles.rolesSidebar}>
            {roles.map((roleObj, i) => (
              <button
                key={i}
                onClick={() => handleRoleSelect(roleObj.role)}
                className={`${styles.roleBtn} ${selectedRole === roleObj.role ? styles.activeRole : ''}`}
              >
                {roleObj.role}
              </button>
            ))}
          </div>

          {/* Role Skills Chart */}
          <div className={styles.skillsInspector}>
            <h3 className={styles.inspectorTitle}>
              Skill requirements for <span className="accent-text">{selectedRole}</span>
            </h3>

            {loadingRoleSkills ? (
              <div style={{ padding: '20px 0' }}>
                <SkeletonBar count={5} />
              </div>
            ) : roleSkills.length > 0 ? (
              <div className={styles.inspectorChart}>
                {roleSkills.map((item, idx) => (
                  <ChartBar
                    key={idx}
                    label={item.skill}
                    value={item.mentions}
                    maxValue={maxRoleMentions}
                    index={idx}
                    suffix=" times required"
                    color="violet"
                  />
                ))}
              </div>
            ) : (
              <p className={styles.noData}>No skill mappings found for this role category.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
