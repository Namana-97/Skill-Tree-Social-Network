// src/routes/index.js — master router
const express = require('express');
const router  = express.Router();

const auth    = require('../middleware/auth');
const authCtrl  = require('../controllers/authController');
const skillCtrl = require('../controllers/skillsController');
const vouchCtrl = require('../controllers/vouchController');
const matchCtrl = require('../controllers/matchController');

// ── AUTH ───────────────────────────────────────────────
// POST   /auth/register
// POST   /auth/login
// GET    /auth/me          (protected)
router.post('/auth/register', authCtrl.register);
router.post('/auth/login',    authCtrl.login);
router.get ('/auth/me',       auth, authCtrl.me);

// ── PROFILES & DISCOVER ───────────────────────────────
// GET    /users/:userId/profile
// GET    /discover          (public; if token provided, includes match_score)
router.get('/users/:userId/profile', matchCtrl.getProfile);
router.get('/discover',              matchCtrl.discover);

// ── SKILLS ────────────────────────────────────────────
// GET    /users/:userId/skills        (public — view anyone's tree)
// POST   /skills                      (protected — add to YOUR tree)
// PUT    /skills/:skillId             (protected)
// DELETE /skills/:skillId             (protected)
// POST   /skills/edges                (protected)
// DELETE /skills/edges/:edgeId        (protected)
router.get   ('/users/:userId/skills',   skillCtrl.getSkillTree);
router.post  ('/skills',                 auth, skillCtrl.addSkill);
router.put   ('/skills/:skillId',        auth, skillCtrl.updateSkill);
router.delete('/skills/:skillId',        auth, skillCtrl.deleteSkill);
router.post  ('/skills/edges',           auth, skillCtrl.addEdge);
router.delete('/skills/edges/:edgeId',   auth, skillCtrl.deleteEdge);

// ── VOUCHES ───────────────────────────────────────────
// GET    /users/:userId/vouches       (public)
// POST   /vouches                     (protected — vouch someone else's skill)
// DELETE /vouches/:vouchId            (protected)
router.get   ('/users/:userId/vouches',  vouchCtrl.getVouchesForUser);
router.post  ('/vouches',               auth, vouchCtrl.createVouch);
router.delete('/vouches/:vouchId',       auth, vouchCtrl.deleteVouch);

// ── MATCHING ──────────────────────────────────────────
// GET    /match/:userId               (public — top complement matches)
router.get('/match/:userId', matchCtrl.getMatches);

module.exports = router;
