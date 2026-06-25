'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import JobCard from '@/components/JobCard';
import Pagination from '@/components/Pagination';
import { SkeletonCard } from '@/components/LoadingSkeleton';
import styles from './page.module.css';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search input state
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [skills, setSkills] = useState(searchParams.get('skills') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [experience, setExperience] = useState(searchParams.get('experience') || '');
  const [role, setRole] = useState(searchParams.get('role') || '');
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Results state
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync state with URL changes (e.g. forward/back buttons)
  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setSkills(searchParams.get('skills') || '');
    setLocation(searchParams.get('location') || '');
    setExperience(searchParams.get('experience') || '');
    setRole(searchParams.get('role') || '');
  }, [searchParams]);

  // Perform search when page or search parameters in URL change
  useEffect(() => {
    async function performSearch() {
      setLoading(true);
      try {
        const queryParams = {
          q: searchParams.get('q') || '',
          skills: searchParams.get('skills') || '',
          location: searchParams.get('location') || '',
          experience: searchParams.get('experience') || '',
          role: searchParams.get('role') || '',
          page,
          pageSize: 10,
        };

        // Don't search if all fields are empty initially (optional, but let's list latest jobs/search standard if empty)
        const res = await api.searchJobs(queryParams);
        setResults(res);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [searchParams, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (skills) params.set('skills', skills);
    if (location) params.set('location', location);
    if (experience) params.set('experience', experience);
    if (role) params.set('role', role);
    params.set('page', '1');

    router.push(`/search?${params.toString()}`);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/search?${params.toString()}`);
  };

  const handleReset = () => {
    setQ('');
    setSkills('');
    setLocation('');
    setExperience('');
    setRole('');
    router.push('/search');
  };

  return (
    <div className={`container ${styles.container}`}>
      <header className={styles.header}>
        <h1 className="section-title">Advanced <span className="accent-text">Search Engine</span></h1>
        <p className="section-subtitle">
          Query the entire database using keywords, matching skills, experience levels, and locations.
        </p>
      </header>

      {/* Search Console */}
      <form onSubmit={handleSearchSubmit} className={`${styles.searchConsole} glass-card`}>
        <div className={styles.mainRow}>
          <div className={styles.inputWrapper}>
            <span className={styles.inputIcon}>🔍</span>
            <input
              type="text"
              placeholder="Keywords (e.g. Frontend Engineer, React, Manager)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="input-field"
            />
          </div>
          <button type="submit" className="btn-primary">Search Platform</button>
        </div>

        <div className={styles.filterGrid}>
          <div className={styles.filterField}>
            <label>Skills (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. Python, SQL, Docker"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="input-field"
            />
          </div>

          <div className={styles.filterField}>
            <label>Location / City</label>
            <input
              type="text"
              placeholder="e.g. Cairo, Dubai, London"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field"
            />
          </div>

          <div className={styles.filterField}>
            <label>Role Category</label>
            <input
              type="text"
              placeholder="e.g. Engineering, Sales"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input-field"
            />
          </div>

          <div className={styles.filterField}>
            <label>Experience Level</label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="input-field"
              style={{ height: '47px' }}
            >
              <option value="">Any Level</option>
              <option value="Entry Level">Entry Level</option>
              <option value="1-2 Years">1-2 Years</option>
              <option value="3-5 Years">3-5 Years</option>
              <option value="5+ Years">5+ Years</option>
              <option value="10+ Years">10+ Years</option>
            </select>
          </div>
        </div>

        <div className={styles.consoleActions}>
          <button type="button" onClick={handleReset} className={styles.resetBtn}>Reset Search</button>
        </div>
      </form>

      {/* Results Section */}
      <main className={styles.resultsWrapper}>
        {error ? (
          <div className={styles.errorCard}>
            <span className={styles.errorIcon}>⚠</span>
            <h3>Search error</h3>
            <p>{error}</p>
          </div>
        ) : loading ? (
          <div className={styles.resultsGrid}>
            <SkeletonCard count={3} />
          </div>
        ) : !results || results.jobs.length === 0 ? (
          <div className={`${styles.noResults} glass-card`}>
            <span className={styles.noResultsIcon}>📭</span>
            <h3>No results found</h3>
            <p>Try broadening your terms, using fewer filters, or checking spelling.</p>
          </div>
        ) : (
          <>
            <div className={styles.resultsHeader}>
              <h2>Matching Postings ({results.total})</h2>
            </div>

            <div className={styles.resultsGrid}>
              {results.jobs.map((job) => (
                <JobCard key={job._id || job.id} job={job} />
              ))}
            </div>

            <Pagination
              page={results.page}
              totalPages={results.total_pages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
        <h2>Loading search console...</h2>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
