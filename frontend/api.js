/**
 * api.js — SkillForge API client
 * Base API: http://localhost:3001/api
 */
const API = (() => {
  const BASE = 'http://localhost:3001/api';

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
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = getToken();
    if (auth || token) {
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

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

  async function discover({ skill, role, sort = 'match', page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();

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
    getProfile,
    getSkillTree,
    addSkill,
    getVouches,
    createVouch,
    discover,
    getMatches,
  };
})();