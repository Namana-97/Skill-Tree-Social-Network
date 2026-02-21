/**
 * seed.js — Populate the DB with demo data.
 * Usage: node src/db/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('./pool');

async function seed() {
  console.log('🌱  Seeding SkillForge database...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. USERS ──────────────────────────────────
    const hash = await bcrypt.hash('password123', 10);

    const { rows: users } = await client.query(`
      INSERT INTO users (username, email, password_hash, display_name, role_title, bio, avatar_initials, avatar_color, xp, level)
      VALUES
        ('aryan',   'aryan@example.com',  $1, 'Aryan Kumar',  'Full-Stack Developer',  'Building things that matter.',   'AK', '#E63B3B', 3400, 34),
        ('lisa',    'lisa@example.com',   $1, 'Lisa Park',    'ML Engineer',           'Deep learning is just cooking.', 'LP', '#5C3FB0', 3800, 38),
        ('james',   'james@example.com',  $1, 'James Tao',    'DevOps Engineer',       'K8s or bust.',                   'JT', '#1A7FC2', 3100, 31),
        ('yuki',    'yuki@example.com',   $1, 'Yuki Sato',    'Frontend Specialist',   'Pixel-perfect or Monday.',       'YS', '#E8849A', 2900, 29),
        ('sofia',   'sofia@example.com',  $1, 'Sofia R.',     'Frontend Engineer',     'UIs that feel something.',       'SR', '#C42B8A', 2700, 27),
        ('chen',    'chen@example.com',   $1, 'Chen Wei',     'Backend Engineer',      'Memory safety is not optional.', 'CW', '#2A9B7A', 3500, 35)
      ON CONFLICT (username) DO NOTHING
      RETURNING id, username
    `, [hash]);

    // Map username → id
    const uid = {};
    users.forEach(u => uid[u.username] = u.id);
    console.log('  ✓ Users inserted:', Object.keys(uid).join(', '));

    // ── 2. SKILLS ─────────────────────────────────
    const skillDefs = [
      // Aryan
      { u:'aryan', name:'JavaScript', level:5, color:'#E63B3B' },
      { u:'aryan', name:'React',      level:4, color:'#5C3FB0' },
      { u:'aryan', name:'Node',       level:4, color:'#1A7FC2' },
      { u:'aryan', name:'SQL',        level:3, color:'#2A9B7A' },
      { u:'aryan', name:'Docker',     level:3, color:'#F5C842' },
      // Lisa
      { u:'lisa', name:'Python',      level:5, color:'#E63B3B' },
      { u:'lisa', name:'TensorFlow',  level:4, color:'#5C3FB0' },
      { u:'lisa', name:'MLOps',       level:4, color:'#2A9B7A' },
      { u:'lisa', name:'SQL',         level:3, color:'#1A7FC2' },
      { u:'lisa', name:'FastAPI',     level:3, color:'#F5C842' },
      // James
      { u:'james', name:'Kubernetes', level:5, color:'#E63B3B' },
      { u:'james', name:'Terraform',  level:4, color:'#1A7FC2' },
      { u:'james', name:'Go',         level:4, color:'#2A9B7A' },
      { u:'james', name:'Linux',      level:3, color:'#F5C842' },
      { u:'james', name:'AWS',        level:3, color:'#5C3FB0' },
      // Yuki
      { u:'yuki', name:'Vue',         level:5, color:'#2A9B7A' },
      { u:'yuki', name:'TypeScript',  level:4, color:'#1A7FC2' },
      { u:'yuki', name:'CSS',         level:4, color:'#E8849A' },
      { u:'yuki', name:'Figma',       level:3, color:'#5C3FB0' },
      // Sofia
      { u:'sofia', name:'React',      level:5, color:'#5C3FB0' },
      { u:'sofia', name:'Next.js',    level:4, color:'#1A1A1A' },
      { u:'sofia', name:'CSS',        level:4, color:'#E8849A' },
      { u:'sofia', name:'GraphQL',    level:3, color:'#E63B3B' },
      // Chen
      { u:'chen', name:'Rust',        level:4, color:'#E63B3B' },
      { u:'chen', name:'Go',          level:4, color:'#2A9B7A' },
      { u:'chen', name:'PostgreSQL',  level:5, color:'#1A7FC2' },
      { u:'chen', name:'Redis',       level:3, color:'#F5C842' },
      { u:'chen', name:'gRPC',        level:3, color:'#5C3FB0' },
    ];

    const skillIds = {};  // "username:skillname" → id
    for (const s of skillDefs) {
      if (!uid[s.u]) continue;
      const { rows } = await client.query(`
        INSERT INTO skills (user_id, name, level, color)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (user_id, name) DO UPDATE SET level=$3
        RETURNING id
      `, [uid[s.u], s.name, s.level, s.color]);
      skillIds[`${s.u}:${s.name}`] = rows[0].id;
    }
    console.log(`  ✓ ${skillDefs.length} skills inserted`);

    // ── 3. SKILL EDGES ────────────────────────────
    const edges = [
      // Aryan
      { u:'aryan', from:'JavaScript', to:'React'  },
      { u:'aryan', from:'JavaScript', to:'Node'   },
      { u:'aryan', from:'Node',       to:'SQL'    },
      { u:'aryan', from:'Node',       to:'Docker' },
      // Lisa
      { u:'lisa',  from:'Python',     to:'TensorFlow' },
      { u:'lisa',  from:'Python',     to:'MLOps'      },
      { u:'lisa',  from:'Python',     to:'SQL'        },
      { u:'lisa',  from:'TensorFlow', to:'FastAPI'    },
      // James
      { u:'james', from:'Kubernetes', to:'Terraform' },
      { u:'james', from:'Kubernetes', to:'Go'        },
      { u:'james', from:'Go',         to:'Linux'     },
      { u:'james', from:'Terraform',  to:'AWS'       },
    ];

    for (const e of edges) {
      const src = skillIds[`${e.u}:${e.from}`];
      const tgt = skillIds[`${e.u}:${e.to}`];
      if (!src || !tgt || !uid[e.u]) continue;
      await client.query(`
        INSERT INTO skill_edges (user_id, source_skill_id, target_skill_id)
        VALUES ($1,$2,$3) ON CONFLICT DO NOTHING
      `, [uid[e.u], src, tgt]);
    }
    console.log(`  ✓ ${edges.length} skill edges inserted`);

    // ── 4. VOUCHES ────────────────────────────────
    // Sofia vouches Aryan's React (she holds React Lv.5 >= Aryan's Lv.4 ✓)
    // James vouches Aryan's Node  (James holds Go/Linux but not Node — skipping in real app)
    // For seed we just insert directly
    const vouchData = [
      { from:'sofia', to:'aryan', skill:'aryan:React',  msg:'Really solid React fundamentals.' },
      { from:'lisa',  to:'aryan', skill:'aryan:Node',   msg:'Helped me with my FastAPI → Node migration.' },
      { from:'chen',  to:'aryan', skill:'aryan:SQL',    msg:'Writes clean, well-indexed queries.' },
    ];

    for (const v of vouchData) {
      const skillId = skillIds[v.skill];
      if (!uid[v.from] || !uid[v.to] || !skillId) continue;
      await client.query(`
        INSERT INTO vouches (voucher_id, recipient_id, skill_id, message)
        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING
      `, [uid[v.from], uid[v.to], skillId, v.msg]);
    }
    console.log(`  ✓ ${vouchData.length} vouches inserted`);

    // ── 5. PRE-COMPUTE MATCHES for Aryan ─────────
    // Simple complement score: (skills they have that you don't) / total unique skills * 100
    const aryanSkills = skillDefs.filter(s=>s.u==='aryan').map(s=>s.name);
    const others = ['lisa','james','yuki','sofia','chen'];
    for (const other of others) {
      const theirSkills = skillDefs.filter(s=>s.u===other).map(s=>s.name);
      const theyFill = theirSkills.filter(s=>!aryanSkills.includes(s)).length;
      const youFill  = aryanSkills.filter(s=>!theirSkills.includes(s)).length;
      const total    = new Set([...aryanSkills,...theirSkills]).size;
      const score    = Math.round(((theyFill + youFill) / total) * 100);
      if (!uid[other]) continue;
      await client.query(`
        INSERT INTO matches (user_a_id, user_b_id, score)
        VALUES ($1,$2,$3) ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET score=$3, computed_at=NOW()
      `, [uid['aryan'], uid[other], score]);
    }
    console.log('  ✓ Match scores computed for Aryan');

    await client.query('COMMIT');
    console.log('✅  Seed complete!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
