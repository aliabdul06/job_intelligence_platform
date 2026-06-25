'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import styles from './page.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, updateProfile, updateUser } = useAuth();

  // Basic Details State
  const [fullName, setFullName] = useState('');
  
  // Profile Details State
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [locationPreference, setLocationPreference] = useState('');
  
  // Array tags list & text inputs
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [desiredRoles, setDesiredRoles] = useState([]);
  const [roleInput, setRoleInput] = useState('');

  // Status indicators
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login?redirect=/profile');
    }
  }, [loading, isAuthenticated, router]);

  // Sync profile data to state on load
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      
      const prof = user.profile || {};
      setBio(prof.bio || '');
      setEducation(prof.education || '');
      setExperienceYears(prof.experience_years ?? 0);
      setLocationPreference(prof.location_preference || '');
      setSkills(prof.skills || []);
      setDesiredRoles(prof.desired_roles || []);
    }
  }, [user]);

  if (loading) {
    return (
      <div className={`container ${styles.container}`}>
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Loading your profile profile...</h2>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      // 1. Update basic info (name)
      await updateUser(fullName);

      // 2. Update profile info
      await updateProfile({
        bio,
        education,
        experience_years: parseInt(experienceYears, 10) || 0,
        location_preference: locationPreference,
        skills,
        desired_roles: desiredRoles,
      });

      setSuccessMsg('Profile updated successfully!');
      
      // Auto clear success message after 3 seconds
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  // Skill tags additions/removals
  const handleAddSkill = (e) => {
    e.preventDefault();
    const clean = skillInput.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  // Desired roles additions/removals
  const handleAddRole = (e) => {
    e.preventDefault();
    const clean = roleInput.trim();
    if (clean && !desiredRoles.includes(clean)) {
      setDesiredRoles([...desiredRoles, clean]);
    }
    setRoleInput('');
  };

  const handleRemoveRole = (roleToRemove) => {
    setDesiredRoles(desiredRoles.filter(r => r !== roleToRemove));
  };

  return (
    <div className={`container ${styles.container}`}>
      <header className={styles.header}>
        <h1 className="section-title">Manage Profile & <span className="accent-text">Preferences</span></h1>
        <p className="section-subtitle">
          Keep your professional details updated to receive perfect job match scores.
        </p>
      </header>

      <form onSubmit={handleSave} className={styles.layout}>
        {/* Left Side: General Profile Info */}
        <div className={styles.mainPanel}>
          <div className={`${styles.card} glass-card`}>
            <h2>Personal Information</h2>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address</label>
                <input
                  type="text"
                  value={user.email}
                  disabled
                  className={`${styles.disabledInput} input-field`}
                />
                <span className={styles.helperText}>Registered email cannot be changed.</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup} style={{ marginTop: '15px' }}>
              <label className={styles.label}>Bio / Summary</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input-field"
                rows="4"
                placeholder="Write a brief professional summary about yourself..."
                maxLength="500"
              />
            </div>
          </div>

          <div className={`${styles.card} glass-card`} style={{ marginTop: '20px' }}>
            <h2>Professional Profile</h2>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Education / Degree</label>
                <input
                  type="text"
                  placeholder="e.g. BSc Computer Science, self-taught"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className={styles.formGroup} style={{ marginTop: '15px' }}>
              <label className={styles.label}>Preferred Region / Location</label>
              <input
                type="text"
                placeholder="e.g. Egypt, remote, Gulf"
                value={locationPreference}
                onChange={(e) => setLocationPreference(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Skill & Role Tags */}
        <aside className={styles.sidebarPanel}>
          {/* Skill Tag Manager */}
          <div className={`${styles.card} glass-card`}>
            <h2>Skills Tag Manager</h2>
            <p className={styles.sideDescription}>Add technologies you work with to configure matching filters.</p>
            
            <div className={styles.tagConsole}>
              <input
                type="text"
                placeholder="e.g. React"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                className="input-field"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSkill(e)}
              />
              <button type="button" onClick={handleAddSkill} className="btn-secondary">Add</button>
            </div>

            <div className={styles.tagsContainer}>
              {skills.map((skill, i) => (
                <span key={i} className={styles.tag}>
                  {skill}
                  <button type="button" onClick={() => handleRemoveSkill(skill)} className={styles.tagClose}>×</button>
                </span>
              ))}
              {skills.length === 0 && (
                <p className={styles.noTags}>No skills added yet.</p>
              )}
            </div>
          </div>

          {/* Desired Roles */}
          <div className={`${styles.card} glass-card`} style={{ marginTop: '20px' }}>
            <h2>Desired Role Categories</h2>
            <p className={styles.sideDescription}>Specify job roles you are interested in.</p>
            
            <div className={styles.tagConsole}>
              <input
                type="text"
                placeholder="e.g. Engineering"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                className="input-field"
                onKeyDown={(e) => e.key === 'Enter' && handleAddRole(e)}
              />
              <button type="button" onClick={handleAddRole} className="btn-secondary">Add</button>
            </div>

            <div className={styles.tagsContainer}>
              {desiredRoles.map((role, i) => (
                <span key={i} className={`${styles.tag} ${styles.roleTag}`}>
                  {role}
                  <button type="button" onClick={() => handleRemoveRole(role)} className={styles.tagClose}>×</button>
                </span>
              ))}
              {desiredRoles.length === 0 && (
                <p className={styles.noTags}>No desired roles added yet.</p>
              )}
            </div>
          </div>

          {/* Submit Actions */}
          <div className={styles.actionPanel}>
            {successMsg && <div className={styles.successAlert}>✓ {successMsg}</div>}
            {errorMsg && <div className={styles.errorAlert}>⚠ {errorMsg}</div>}
            
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ width: '100%', height: '48px' }}
            >
              {submitting ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
