const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  getRefreshToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  setTokens(access, refresh) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    let response = await fetch(url, config);

    // On 401, try refreshing token
    if (response.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        response = await fetch(url, { ...config, headers });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async refreshAccessToken() {
    try {
      const refreshToken = this.getRefreshToken();
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  // ── Auth ────────────────────────────────────────────
  async register(email, password, fullName) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  // ── Users ───────────────────────────────────────────
  async getMe() {
    return this.request('/users/me');
  }

  async updateMe(fullName) {
    return this.request(`/users/me?full_name=${encodeURIComponent(fullName)}`, {
      method: 'PUT',
    });
  }

  async updateProfile(profileData) {
    return this.request('/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // ── Homepage ────────────────────────────────────────
  async getHomepage(skillsLimit = 10, jobsLimit = 10) {
    return this.request(`/homepage?skills_limit=${skillsLimit}&jobs_limit=${jobsLimit}`);
  }

  // ── Jobs ────────────────────────────────────────────
  async getJobs(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.pageSize) query.set('page_size', params.pageSize);
    if (params.role) query.set('role', params.role);
    if (params.experience) query.set('experience', params.experience);
    if (params.region) query.set('region', params.region);
    return this.request(`/jobs?${query.toString()}`);
  }

  async getJob(jobId) {
    return this.request(`/jobs/${jobId}`);
  }

  async getLatestJobs(limit = 10) {
    return this.request(`/jobs/latest?limit=${limit}`);
  }

  async getJobStats() {
    return this.request('/jobs/stats');
  }

  // ── Search ──────────────────────────────────────────
  async searchJobs(params = {}) {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.skills) query.set('skills', params.skills);
    if (params.location) query.set('location', params.location);
    if (params.experience) query.set('experience', params.experience);
    if (params.role) query.set('role', params.role);
    if (params.page) query.set('page', params.page);
    if (params.pageSize) query.set('page_size', params.pageSize);
    return this.request(`/search?${query.toString()}`);
  }

  // ── Skills ──────────────────────────────────────────
  async getTopSkills(limit = 20) {
    return this.request(`/skills/top?limit=${limit}`);
  }

  async getSkillDistribution() {
    return this.request('/skills/distribution');
  }

  async getSkillsByRole() {
    return this.request('/skills/by-role');
  }

  async getSkillsForRole(roleName) {
    return this.request(`/skills/by-role/${encodeURIComponent(roleName)}`);
  }

  // ── Regions ─────────────────────────────────────────
  async getTopRegions(limit = 15) {
    return this.request(`/regions/top?limit=${limit}`);
  }

  async getRegionStats(regionName) {
    return this.request(`/regions/${encodeURIComponent(regionName)}/stats`);
  }

  // ── Recommendations ─────────────────────────────────
  async getRecommendations(limit = 20) {
    return this.request(`/recommendations?limit=${limit}`);
  }

  async getSkillsGap(limit = 10) {
    return this.request(`/recommendations/skills-gap?limit=${limit}`);
  }
}

const api = new ApiClient();
export default api;
