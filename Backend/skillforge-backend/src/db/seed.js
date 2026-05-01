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
      ON CONFLICT (username) DO UPDATE
      SET email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          display_name = EXCLUDED.display_name,
          role_title = EXCLUDED.role_title,
          bio = EXCLUDED.bio,
          avatar_initials = EXCLUDED.avatar_initials,
          avatar_color = EXCLUDED.avatar_color,
          xp = EXCLUDED.xp,
          level = EXCLUDED.level
      RETURNING id, username
    `, [hash]);

    const uid = {};
    users.forEach(u => uid[u.username] = u.id);
    console.log('  ✓ Users inserted:', Object.keys(uid).join(', '));

    await client.query(`
      INSERT INTO site_settings (key, value_text)
      VALUES ('landing_featured_user_id', $1)
      ON CONFLICT (key) DO UPDATE
      SET value_text = EXCLUDED.value_text,
          updated_at = NOW()
    `, [String(uid.aryan || '')]);
    console.log('  ✓ Landing featured user configured');

    // ── 2. SKILLS ─────────────────────────────────
    const skillDefs = [
      { u:'aryan', name:'JavaScript', level:5, color:'#E63B3B' },
      { u:'aryan', name:'React',      level:4, color:'#5C3FB0' },
      { u:'aryan', name:'Node',       level:4, color:'#1A7FC2' },
      { u:'aryan', name:'SQL',        level:3, color:'#2A9B7A' },
      { u:'aryan', name:'Docker',     level:3, color:'#F5C842' },
      { u:'lisa',  name:'Python',     level:5, color:'#E63B3B' },
      { u:'lisa',  name:'TensorFlow', level:4, color:'#5C3FB0' },
      { u:'lisa',  name:'MLOps',      level:4, color:'#2A9B7A' },
      { u:'lisa',  name:'SQL',        level:3, color:'#1A7FC2' },
      { u:'lisa',  name:'FastAPI',    level:3, color:'#F5C842' },
      { u:'james', name:'Kubernetes', level:5, color:'#E63B3B' },
      { u:'james', name:'Terraform',  level:4, color:'#1A7FC2' },
      { u:'james', name:'Go',         level:4, color:'#2A9B7A' },
      { u:'james', name:'Linux',      level:3, color:'#F5C842' },
      { u:'james', name:'AWS',        level:3, color:'#5C3FB0' },
      { u:'yuki',  name:'Vue',        level:5, color:'#2A9B7A' },
      { u:'yuki',  name:'TypeScript', level:4, color:'#1A7FC2' },
      { u:'yuki',  name:'CSS',        level:4, color:'#E8849A' },
      { u:'yuki',  name:'Figma',      level:3, color:'#5C3FB0' },
      { u:'sofia', name:'React',      level:5, color:'#5C3FB0' },
      { u:'sofia', name:'Next.js',    level:4, color:'#1A1A1A' },
      { u:'sofia', name:'CSS',        level:4, color:'#E8849A' },
      { u:'sofia', name:'GraphQL',    level:3, color:'#E63B3B' },
      { u:'chen',  name:'Rust',       level:4, color:'#E63B3B' },
      { u:'chen',  name:'Go',         level:4, color:'#2A9B7A' },
      { u:'chen',  name:'PostgreSQL', level:5, color:'#1A7FC2' },
      { u:'chen',  name:'Redis',      level:3, color:'#F5C842' },
      { u:'chen',  name:'gRPC',       level:3, color:'#5C3FB0' },
    ];

    const skillIds = {};
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
      { u:'aryan', from:'JavaScript', to:'React'      },
      { u:'aryan', from:'JavaScript', to:'Node'       },
      { u:'aryan', from:'Node',       to:'SQL'        },
      { u:'aryan', from:'Node',       to:'Docker'     },
      { u:'lisa',  from:'Python',     to:'TensorFlow' },
      { u:'lisa',  from:'Python',     to:'MLOps'      },
      { u:'lisa',  from:'Python',     to:'SQL'        },
      { u:'lisa',  from:'TensorFlow', to:'FastAPI'    },
      { u:'james', from:'Kubernetes', to:'Terraform'  },
      { u:'james', from:'Kubernetes', to:'Go'         },
      { u:'james', from:'Go',         to:'Linux'      },
      { u:'james', from:'Terraform',  to:'AWS'        },
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
    const vouchData = [
      { from:'sofia', to:'aryan', skill:'aryan:React', msg:'Really solid React fundamentals.'              },
      { from:'lisa',  to:'aryan', skill:'aryan:Node',  msg:'Helped me with my FastAPI → Node migration.'  },
      { from:'chen',  to:'aryan', skill:'aryan:SQL',   msg:'Writes clean, well-indexed queries.'           },
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

    // ── 5. TESTIMONIALS ───────────────────────────
    const testimonials = [
      {
        slug: 'sofia-story',
        display_name: 'Sofia R.',
        role_title: 'Frontend Engineer',
        quote: "Finally a way to show my skills that doesn't look like every other LinkedIn profile. My tree got me three interview requests in a single month.",
        avatar_initials: 'SR',
        avatar_color: '#C42B8A',
        sort_order: 1,
      },
      {
        slug: 'marcus-story',
        display_name: 'Marcus K.',
        role_title: 'ML Researcher & Founder',
        quote: "The complement matching is genuinely magical. Found my co-founder through SkillForge — his backend depth fills exactly what I was missing.",
        avatar_initials: 'MK',
        avatar_color: '#5C3FB0',
        sort_order: 2,
      },
      {
        slug: 'jamie-story',
        display_name: 'Jamie P.',
        role_title: 'CTO, Early-Stage Startup',
        quote: "Instead of posting job descriptions, I shared our skill gaps. The right people found us in 48 hours. I haven't posted a listing since.",
        avatar_initials: 'JP',
        avatar_color: '#1A7FC2',
        sort_order: 3,
      },
    ];

    for (const testimonial of testimonials) {
      await client.query(`
        INSERT INTO testimonials (slug, display_name, role_title, quote, avatar_initials, avatar_color, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (slug) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            role_title = EXCLUDED.role_title,
            quote = EXCLUDED.quote,
            avatar_initials = EXCLUDED.avatar_initials,
            avatar_color = EXCLUDED.avatar_color,
            sort_order = EXCLUDED.sort_order
      `, [
        testimonial.slug,
        testimonial.display_name,
        testimonial.role_title,
        testimonial.quote,
        testimonial.avatar_initials,
        testimonial.avatar_color,
        testimonial.sort_order,
      ]);
    }
    console.log(`  ✓ ${testimonials.length} testimonials inserted`);

    // ── 6. PRE-COMPUTE MATCHES — ALL user pairs ───
    // FIX: original only computed for Aryan — now computes for everyone
    const allUsernames = Object.keys(uid);
    let matchCount = 0;

    for (let i = 0; i < allUsernames.length; i++) {
      for (let j = 0; j < allUsernames.length; j++) {
        if (i === j) continue;
        const userA = allUsernames[i];
        const userB = allUsernames[j];

        const aSkills = skillDefs.filter(s => s.u === userA).map(s => s.name);
        const bSkills = skillDefs.filter(s => s.u === userB).map(s => s.name);

        const theyFill = bSkills.filter(s => !aSkills.includes(s)).length;
        const youFill  = aSkills.filter(s => !bSkills.includes(s)).length;
        const total    = new Set([...aSkills, ...bSkills]).size;
        const score    = total > 0 ? Math.round(((theyFill + youFill) / total) * 100) : 0;

        if (!uid[userA] || !uid[userB]) continue;
        await client.query(`
          INSERT INTO matches (user_a_id, user_b_id, score)
          VALUES ($1,$2,$3)
          ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET score=$3, computed_at=NOW()
        `, [uid[userA], uid[userB], score]);
        matchCount++;
      }
    }
    console.log(`  ✓ ${matchCount} match scores computed (all user pairs)`);

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
