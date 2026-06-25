'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import JobCard from '@/components/JobCard';
import Pagination from '@/components/Pagination';
import { SkeletonCard } from '@/components/LoadingSkeleton';
import styles from './page.module.css';

function JobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL State
  const page = parseInt(searchParams.get('page') || '1', 10);
  const selectedRole = searchParams.get('role') || '';
  const selectedExperience = searchParams.get('experience') || '';
  const selectedRegion = searchParams.get('region') || '';

  // Data State
  const [jobsData, setJobsData] = useState(null);
  const [stats, setStats] = useState(null);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState(null);

  // Fetch stats for filter options
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const [statsData, regionsData] = await Promise.all([
          api.getJobStats(),
          api.getTopRegions(30),
        ]);
        setStats(statsData);
        setRegions(regionsData.top_regions || []);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      } finally {
        setLoadingFilters(false);
      }
    }
    fetchFilterOptions();
  }, []);

  // Fetch jobs when filters or page change
  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      try {
        const result = await api.getJobs({
          page,
          pageSize: 10,
          role: selectedRole,
          experience: selectedExperience,
          region: selectedRegion,
        });
        setJobsData(result);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, [page, selectedRole, selectedExperience, selectedRegion]);

  const updateFilters = (newFilters) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1'); // Reset to page 1 on filter change
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`/jobs?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/jobs');
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/jobs?${params.toString()}`);
  };

  // Extract filter choices
  const roleOptions = stats?.by_role || [];
  const experienceOptions = stats?.by_experience || [];
  const regionOptions = regions || [];

  return (
    <div className={`container ${styles.container}`}>
      <header className={styles.header}>
        <h1 className="section-title">Explore <span className="accent-text">Job Opportunities</span></h1>
        <p className="section-subtitle">
          Discover roles match-fit for your skillset and experience. Apply filters to narrow down.
        </p>
      </header>

      <div className={styles.layout}>
        {/* Sidebar Filters */}
        <aside className={`${styles.sidebar} glass-card`}>
          <div className={styles.sidebarHeader}>
            <h3>Filters</h3>
            {(selectedRole || selectedExperience || selectedRegion) && (
              <button onClick={clearFilters} className={styles.clearBtn}>Clear All</button>
            )}
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Role Category</label>
            <select
              value={selectedRole}
              onChange={(e) => updateFilters({ role: e.target.value })}
              className={styles.select}
              disabled={loadingFilters}
            >
              <option value="">All Categories</option>
              {roleOptions.map((opt, i) => (
                <option key={i} value={opt.role}>
                  {opt.role} ({opt.count})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Experience Level</label>
            <select
              value={selectedExperience}
              onChange={(e) => updateFilters({ experience: e.target.value })}
              className={styles.select}
              disabled={loadingFilters}
            >
              <option value="">All Levels</option>
              {experienceOptions.map((opt, i) => (
                <option key={i} value={opt.level}>
                  {opt.level} ({opt.count})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>Region</label>
            <select
              value={selectedRegion}
              onChange={(e) => updateFilters({ region: e.target.value })}
              className={styles.select}
              disabled={loadingFilters}
            >
              <option value="">All Regions</option>
              {regionOptions.map((opt, i) => (
                <option key={i} value={opt.region}>
                  {opt.region} ({opt.count})
                </option>
              ))}
            </select>
          </div>
        </aside>

        {/* Jobs List Grid */}
        <main className={styles.mainContent}>
          {error ? (
            <div className={styles.errorCard}>
              <span className={styles.errorIcon}>⚠</span>
              <h3>Failed to fetch job postings</h3>
              <p>{error}</p>
            </div>
          ) : loading ? (
            <div className={styles.jobsGrid}>
              <SkeletonCard count={4} />
            </div>
          ) : !jobsData || jobsData.jobs.length === 0 ? (
            <div className={`${styles.noResults} glass-card`}>
              <span className={styles.noResultsIcon}>🔍</span>
              <h3>No jobs match your search</h3>
              <p>Try resetting the filters or modifying your criteria.</p>
              <button onClick={clearFilters} className="btn-primary">Reset Filters</button>
            </div>
          ) : (
            <>
              <div className={styles.metaRow}>
                <p className={styles.countText}>
                  Showing <strong>{jobsData.jobs.length}</strong> of <strong>{jobsData.total}</strong> job postings
                </p>
              </div>

              <div className={styles.jobsGrid}>
                {jobsData.jobs.map((job) => (
                  <JobCard key={job._id || job.id} job={job} />
                ))}
              </div>

              <Pagination
                page={jobsData.page}
                totalPages={jobsData.total_pages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
        <h2>Loading job opportunities...</h2>
      </div>
    }>
      <JobsContent />
    </Suspense>
  );
}
