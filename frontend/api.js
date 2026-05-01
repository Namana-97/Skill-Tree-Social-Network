/**
 * api.js — SkillForge API client
 * Base API: http://localhost:3001/api
 */
const API = (() => {
  const configuredBase = window.API_BASE || localStorage.getItem('sf_api_base');
  const inferredHost = window.location.hostname || 'localhost';
  const defaultBase = `http://${inferredHost}:3001/api`;
  const BASE = configuredBase || defaultBase;

  function getToken() {
    return localStorage.getItem('sf_token');
  }

  function setToken(token) {
    localStorage.setItem('sf_token', token);
  }

  function clearToken() {
    localStorage.removeItem('sf_token');
  }

  function isLoggedIn() {
    return !!getToken();
  }

  async function req(method, path, body = null, auth = false) {
    const headers = {};
    const hasBody = body !== null && body !== undefined;

    const token = getToken();
    if (auth || token) {
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }

    let res;
    try {
      res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: hasBody ? JSON.stringify(body) : null,
      });
    } catch (error) {
      throw new Error(
        `Could not reach the API at ${BASE}. Start the backend on port 3001 and load the frontend from localhost or 127.0.0.1.`
      );
    }

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (res.status === 401) {
      clearToken();
    }

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    return data;
  }

  async function register(username, email, password, display_name, role_title) {
    const data = await req('POST', '/auth/register', {
      username,
      email,
      password,
      display_name,
      role_title,
    });

    if (data.token) setToken(data.token);
    return data;
  }

  async function login(email, password) {
    const data = await req('POST', '/auth/login', { email, password });

    if (data.token) setToken(data.token);
    return data;
  }

  async function me() {
    return req('GET', '/auth/me', null, true);
  }

  function logout() {
    clearToken();
    localStorage.removeItem('sf_user_id');
    window.location.href = 'LandingPage.html';
  }

  async function getProfile(userId) {
    return req('GET', `/users/${userId}/profile`, null, isLoggedIn());
  }

  async function getLandingContent() {
    return req('GET', '/site-content/landing');
  }

  async function getSkillTree(userId) {
    return req('GET', `/users/${userId}/skills`, null, isLoggedIn());
  }

  async function addSkill(skillData) {
    return req('POST', '/skills', skillData, true);
  }

  async function getVouches(userId) {
    return req('GET', `/users/${userId}/vouches`, null, isLoggedIn());
  }

  async function createVouch(skill_id, message) {
    return req('POST', '/vouches', { skill_id, message }, true);
  }

  async function updateSkill(skillId, skillData) {
    return req('PUT', `/skills/${skillId}`, skillData, true);
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

  async function discover({ q, skill, role, sort = 'match', page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();

    if (q) params.set('q', q);
    if (skill) params.set('skill', skill);
    if (role) params.set('role', role);
    params.set('sort', sort);
    params.set('page', page);
    params.set('limit', limit);

    return req('GET', `/discover?${params.toString()}`, null, isLoggedIn());
  }

  async function getMatches(userId, limit = 10) {
    return req('GET', `/match/${userId}?limit=${limit}`, null, true);
  }

  return {
    register,
    login,
    me,
    logout,
    isLoggedIn,
    getToken,
    getLandingContent,
    getProfile,
    getSkillTree,
    addSkill,
    updateSkill,
    deleteSkill,
    addEdge,
    deleteEdge,
    getVouches,
    createVouch,
    discover,
    getMatches,
  };
})();
