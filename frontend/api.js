/**
 * api.js — SkillForge API client
 * Place this file in your frontend/ folder.
 * Every HTML page imports this with:
 *   <script src="api.js"></script>
 */

const API = (() => {

    const BASE = 'http://localhost:3001/api';
  
    // ── Token helpers ────────────────────────────────────
    function getToken()       { return localStorage.getItem('sf_token'); }
    function setToken(t)      { localStorage.setItem('sf_token', t); }
    function clearToken()     { localStorage.removeItem('sf_token'); }
    function isLoggedIn()     { return !!getToken(); }
  
    // ── Core fetch wrapper ───────────────────────────────
    async function req(method, path, body = null, auth = false) {
      const headers = { 'Content-Type': 'application/json' };
      if (auth) {
        const token = getToken();
        if (!token) throw new Error('Not logged in.');
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    }
  
    // ── AUTH ─────────────────────────────────────────────
    async function register(username, email, password, display_name, role_title) {
      const data = await req('POST', '/auth/register', { username, email, password, display_name, role_title });
      setToken(data.token);
      return data.user;
    }
  
    async function login(email, password) {
      const data = await req('POST', '/auth/login', { email, password });
      setToken(data.token);
      return data.user;
    }
  
    async function me() {
      return req('GET', '/auth/me', null, true);
    }
  
    function logout() {
      clearToken();
      window.location.href = 'LandingPage.html';
    }
  
    // ── PROFILE ──────────────────────────────────────────
    async function getProfile(userId) {
      return req('GET', `/users/${userId}/profile`);
    }
  
    // ── SKILL TREE ───────────────────────────────────────
    async function getSkillTree(userId) {
      return req('GET', `/users/${userId}/skills`);
    }
  
    async function addSkill(name, level, color, proof_url) {
      return req('POST', '/skills', { name, level, color, proof_url }, true);
    }
  
    async function updateSkill(skillId, fields) {
      return req('PUT', `/skills/${skillId}`, fields, true);
    }
  
    async function deleteSkill(skillId) {
      return req('DELETE', `/skills/${skillId}`, null, true);
    }
  
    async function addEdge(source_skill_id, target_skill_id) {
      return req('POST', '/skills/edges', { source_skill_id, target_skill_id }, true);
    }
  
    async function deleteEdge(edgeId) {
      return req('DELETE', `/skills/edges/${edgeId}`, null, true);
    }
  
    // ── VOUCHES ──────────────────────────────────────────
    async function getVouches(userId) {
      return req('GET', `/users/${userId}/vouches`);
    }
  
    async function createVouch(skill_id, message) {
      return req('POST', '/vouches', { skill_id, message }, true);
    }
  
    // ── DISCOVER ─────────────────────────────────────────
    async function discover({ skill, role, sort = 'match', page = 1, limit = 20 } = {}) {
      const params = new URLSearchParams();
      if (skill) params.set('skill', skill);
      if (role)  params.set('role', role);
      params.set('sort', sort);
      params.set('page', page);
      params.set('limit', limit);
  
      // Include auth token if logged in so API returns match_score
      return req('GET', `/discover?${params}`, null, isLoggedIn());
    }
  
    // ── MATCHES ──────────────────────────────────────────
    async function getMatches(userId, limit = 10) {
      return req('GET', `/match/${userId}?limit=${limit}`);
    }
  
    // ── Expose ───────────────────────────────────────────
    return {
      // auth
      register, login, me, logout, isLoggedIn, getToken,
      // profile
      getProfile,
      // skills
      getSkillTree, addSkill, updateSkill, deleteSkill, addEdge, deleteEdge,
      // vouches
      getVouches, createVouch,
      // discover + match
      discover, getMatches,
    };
  })();