// src/routes/index.js — master router
const express = require('express');
const router  = express.Router();

const auth      = require('../middleware/auth');
const authCtrl  = require('../controllers/authController');
const skillCtrl = require('../controllers/skillsController');
const vouchCtrl = require('../controllers/vouchController');
const matchCtrl = require('../controllers/matchController');

// ── AUTH ───────────────────────────────────────────────
router.post('/auth/register', authCtrl.registerRules, authCtrl.register);
router.post('/auth/login',    authCtrl.loginRules,    authCtrl.login);
router.get ('/auth/me',       auth,                   authCtrl.me);

// ── PROFILES & DISCOVER ───────────────────────────────
router.get('/users/:userId/profile', matchCtrl.getProfile);
router.get('/discover',              matchCtrl.discover);

// ── SKILLS ────────────────────────────────────────────
router.get   ('/users/:userId/skills',   skillCtrl.getSkillTree);
router.post  ('/skills',                 auth, skillCtrl.addSkillRules,    skillCtrl.addSkill);
router.put   ('/skills/:skillId',        auth, skillCtrl.updateSkillRules, skillCtrl.updateSkill);
router.delete('/skills/:skillId',        auth, skillCtrl.deleteSkill);
router.post  ('/skills/edges',           auth, skillCtrl.addEdge);
router.delete('/skills/edges/:edgeId',   auth, skillCtrl.deleteEdge);

// ── VOUCHES ───────────────────────────────────────────
router.get   ('/users/:userId/vouches',  vouchCtrl.getVouchesForUser);
router.post  ('/vouches',               auth, vouchCtrl.createVouch);
router.delete('/vouches/:vouchId',       auth, vouchCtrl.deleteVouch);

// ── MATCHING ──────────────────────────────────────────
router.get('/match/:userId', matchCtrl.getMatches);

module.exports = router;