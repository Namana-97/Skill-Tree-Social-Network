import 'dotenv/config';
import bcrypt from 'bcryptjs';

import { recomputeMatches } from '@/lib/matches';
import { prisma } from '@/lib/prisma';

const PASSWORD = 'password123';

const users = [
  {
    username: 'aryan',
    email: 'aryan@example.com',
    displayName: 'Aryan Kumar',
    roleTitle: 'Full-Stack Developer',
    bio: 'Building things that matter.',
    avatarInitials: 'AK',
    avatarColor: '#E63B3B',
    xp: 3400,
    level: 34
  },
  {
    username: 'lisa',
    email: 'lisa@example.com',
    displayName: 'Lisa Park',
    roleTitle: 'ML Engineer',
    bio: 'Deep learning is just cooking.',
    avatarInitials: 'LP',
    avatarColor: '#5C3FB0',
    xp: 3800,
    level: 38
  },
  {
    username: 'james',
    email: 'james@example.com',
    displayName: 'James Tao',
    roleTitle: 'DevOps Engineer',
    bio: 'K8s or bust.',
    avatarInitials: 'JT',
    avatarColor: '#1A7FC2',
    xp: 3100,
    level: 31
  },
  {
    username: 'yuki',
    email: 'yuki@example.com',
    displayName: 'Yuki Sato',
    roleTitle: 'Frontend Specialist',
    bio: 'Pixel-perfect or Monday.',
    avatarInitials: 'YS',
    avatarColor: '#E8849A',
    xp: 2900,
    level: 29
  },
  {
    username: 'sofia',
    email: 'sofia@example.com',
    displayName: 'Sofia R.',
    roleTitle: 'Frontend Engineer',
    bio: 'UIs that feel something.',
    avatarInitials: 'SR',
    avatarColor: '#C42B8A',
    xp: 2700,
    level: 27
  },
  {
    username: 'chen',
    email: 'chen@example.com',
    displayName: 'Chen Wei',
    roleTitle: 'Backend Engineer',
    bio: 'Memory safety is not optional.',
    avatarInitials: 'CW',
    avatarColor: '#2A9B7A',
    xp: 3500,
    level: 35
  }
] as const;

const skills = [
  { username: 'aryan', name: 'JavaScript', level: 5, color: '#E63B3B' },
  { username: 'aryan', name: 'React', level: 4, color: '#5C3FB0' },
  { username: 'aryan', name: 'Node', level: 4, color: '#1A7FC2' },
  { username: 'aryan', name: 'SQL', level: 3, color: '#2A9B7A' },
  { username: 'aryan', name: 'Docker', level: 3, color: '#F5C842' },
  { username: 'lisa', name: 'Python', level: 5, color: '#E63B3B' },
  { username: 'lisa', name: 'TensorFlow', level: 4, color: '#5C3FB0' },
  { username: 'lisa', name: 'MLOps', level: 4, color: '#2A9B7A' },
  { username: 'lisa', name: 'SQL', level: 3, color: '#1A7FC2' },
  { username: 'lisa', name: 'FastAPI', level: 3, color: '#F5C842' },
  { username: 'james', name: 'Kubernetes', level: 5, color: '#E63B3B' },
  { username: 'james', name: 'Terraform', level: 4, color: '#1A7FC2' },
  { username: 'james', name: 'Go', level: 4, color: '#2A9B7A' },
  { username: 'james', name: 'Linux', level: 3, color: '#F5C842' },
  { username: 'james', name: 'AWS', level: 3, color: '#5C3FB0' },
  { username: 'yuki', name: 'Vue', level: 5, color: '#2A9B7A' },
  { username: 'yuki', name: 'TypeScript', level: 4, color: '#1A7FC2' },
  { username: 'yuki', name: 'CSS', level: 4, color: '#E8849A' },
  { username: 'yuki', name: 'Figma', level: 3, color: '#5C3FB0' },
  { username: 'sofia', name: 'React', level: 5, color: '#5C3FB0' },
  { username: 'sofia', name: 'Next.js', level: 4, color: '#1A1A1A' },
  { username: 'sofia', name: 'CSS', level: 4, color: '#E8849A' },
  { username: 'sofia', name: 'GraphQL', level: 3, color: '#E63B3B' },
  { username: 'chen', name: 'Rust', level: 4, color: '#E63B3B' },
  { username: 'chen', name: 'Go', level: 4, color: '#2A9B7A' },
  { username: 'chen', name: 'PostgreSQL', level: 5, color: '#1A7FC2' },
  { username: 'chen', name: 'Redis', level: 3, color: '#F5C842' },
  { username: 'chen', name: 'gRPC', level: 3, color: '#5C3FB0' }
] as const;

const edges = [
  { username: 'aryan', from: 'JavaScript', to: 'React' },
  { username: 'aryan', from: 'JavaScript', to: 'Node' },
  { username: 'aryan', from: 'Node', to: 'SQL' },
  { username: 'aryan', from: 'Node', to: 'Docker' },
  { username: 'lisa', from: 'Python', to: 'TensorFlow' },
  { username: 'lisa', from: 'Python', to: 'MLOps' },
  { username: 'lisa', from: 'Python', to: 'SQL' },
  { username: 'lisa', from: 'TensorFlow', to: 'FastAPI' },
  { username: 'james', from: 'Kubernetes', to: 'Terraform' },
  { username: 'james', from: 'Kubernetes', to: 'Go' },
  { username: 'james', from: 'Go', to: 'Linux' },
  { username: 'james', from: 'Terraform', to: 'AWS' }
] as const;

const vouches = [
  {
    from: 'sofia',
    to: 'aryan',
    skillKey: 'aryan:React',
    message: 'Really solid React fundamentals.'
  },
  {
    from: 'lisa',
    to: 'aryan',
    skillKey: 'aryan:Node',
    message: 'Helped me with my FastAPI to Node migration.'
  },
  {
    from: 'chen',
    to: 'aryan',
    skillKey: 'aryan:SQL',
    message: 'Writes clean, well-indexed queries.'
  }
] as const;

const skillEvidence = [
  {
    skillKey: 'aryan:React',
    type: 'project',
    title: 'SkillForge profile and tree flow',
    url: 'https://github.com/aryan-kumar/skillforge/tree/main/frontend',
    description: 'Built the interactive profile tree, edit modal, and auth-aware profile state.',
    impact: 'Shipped the core candidate profile experience used across the product.',
    issuer: 'SkillForge'
  },
  {
    skillKey: 'aryan:Node',
    type: 'repo',
    title: 'Matching and vouch API layer',
    url: 'https://github.com/aryan-kumar/skillforge/tree/main/src/app/api',
    description: 'Implemented route handlers for auth, skills, vouches, and complement matching.',
    impact: 'Reduced profile actions to a consistent API contract across pages.',
    issuer: 'SkillForge'
  },
  {
    skillKey: 'aryan:SQL',
    type: 'case_study',
    title: 'SkillForge Postgres schema design',
    url: 'https://github.com/aryan-kumar/skillforge/tree/main/prisma',
    description: 'Modeled users, skills, edges, vouches, matches, and landing content tables.',
    impact: 'Enabled persisted skill graphs and trust signals instead of demo-only state.',
    issuer: 'SkillForge'
  },
  {
    skillKey: 'lisa:TensorFlow',
    type: 'project',
    title: 'Vision prototype with TensorFlow',
    url: 'https://github.com/lisa-park/vision-lab',
    description: 'Trained and evaluated a lightweight image classifier for internal dataset triage.',
    impact: 'Cut manual triage time for the pilot dataset by roughly 40 percent.',
    issuer: 'Research Lab'
  },
  {
    skillKey: 'james:Kubernetes',
    type: 'case_study',
    title: 'Cluster rollout playbook',
    url: 'https://github.com/jamestao/platform-playbooks',
    description: 'Documented service rollout, rollback, and observability patterns for production clusters.',
    impact: 'Standardized release procedures across three services.',
    issuer: 'Platform Team'
  },
  {
    skillKey: 'yuki:TypeScript',
    type: 'work_sample',
    title: 'Design system component library',
    url: 'https://github.com/yuki-sato/ui-kit',
    description: 'Typed reusable UI primitives for product teams using strict component contracts.',
    impact: 'Removed duplicated button, modal, and form implementations across screens.',
    issuer: 'Design Systems'
  },
  {
    skillKey: 'sofia:Next.js',
    type: 'demo',
    title: 'Startup marketing site with Next.js',
    url: 'https://github.com/sofiar/startup-site',
    description: 'Built a polished marketing and onboarding flow with server-rendered pages.',
    impact: 'Supported early customer demos and inbound signups for the product.',
    issuer: 'Early-Stage Startup'
  },
  {
    skillKey: 'chen:PostgreSQL',
    type: 'article',
    title: 'Query tuning notes for production APIs',
    url: 'https://github.com/chenwei/perf-notes',
    description: 'Shared indexing, query plans, and connection-pool practices for high-traffic routes.',
    impact: 'Improved median API response times in the internal benchmark environment.',
    issuer: 'Engineering Notes'
  }
] as const;

const testimonials = [
  {
    slug: 'sofia-story',
    displayName: 'Sofia R.',
    roleTitle: 'Frontend Engineer',
    quote:
      "Finally a way to show my skills that doesn't look like every other LinkedIn profile. My tree got me three interview requests in a single month.",
    avatarInitials: 'SR',
    avatarColor: '#C42B8A',
    sortOrder: 1
  },
  {
    slug: 'marcus-story',
    displayName: 'Marcus K.',
    roleTitle: 'ML Researcher & Founder',
    quote:
      'The complement matching is genuinely magical. Found my co-founder through SkillForge; his backend depth fills exactly what I was missing.',
    avatarInitials: 'MK',
    avatarColor: '#5C3FB0',
    sortOrder: 2
  },
  {
    slug: 'jamie-story',
    displayName: 'Jamie P.',
    roleTitle: 'CTO, Early-Stage Startup',
    quote:
      "Instead of posting job descriptions, I shared our skill gaps. The right people found us in 48 hours. I haven't posted a listing since.",
    avatarInitials: 'JP',
    avatarColor: '#1A7FC2',
    sortOrder: 3
  }
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await prisma.$transaction(async (tx) => {
    for (const user of users) {
      await tx.user.upsert({
        where: { username: user.username },
        update: {
          email: user.email,
          passwordHash,
          displayName: user.displayName,
          roleTitle: user.roleTitle,
          bio: user.bio,
          avatarInitials: user.avatarInitials,
          avatarColor: user.avatarColor,
          xp: user.xp,
          level: user.level
        },
        create: {
          username: user.username,
          email: user.email,
          passwordHash,
          displayName: user.displayName,
          roleTitle: user.roleTitle,
          bio: user.bio,
          avatarInitials: user.avatarInitials,
          avatarColor: user.avatarColor,
          xp: user.xp,
          level: user.level
        }
      });
    }

    const seededUsers = await tx.user.findMany({
      where: {
        username: {
          in: users.map((user) => user.username)
        }
      },
      select: {
        id: true,
        username: true
      }
    });

    const userIdByUsername = new Map(seededUsers.map((user) => [user.username, user.id]));
    const seededUserIds = seededUsers.map((user) => user.id);

    await tx.match.deleteMany({
      where: {
        OR: [
          { userAId: { in: seededUserIds } },
          { userBId: { in: seededUserIds } }
        ]
      }
    });

    await tx.skillEdge.deleteMany({
      where: {
        userId: {
          in: seededUserIds
        }
      }
    });

    await tx.vouch.deleteMany({
      where: {
        OR: [
          { voucherId: { in: seededUserIds } },
          { recipientId: { in: seededUserIds } }
        ]
      }
    });

    await tx.skill.deleteMany({
      where: {
        userId: {
          in: seededUserIds
        }
      }
    });

    for (const skill of skills) {
      const userId = userIdByUsername.get(skill.username);
      if (!userId) continue;
      const evidenceForSkill = skillEvidence.filter(
        (item) => item.skillKey === `${skill.username}:${skill.name}`
      );

      await tx.skill.create({
        data: {
          userId,
          name: skill.name,
          level: skill.level,
          color: skill.color,
          proofUrl: evidenceForSkill[0]?.url || null
        }
      });
    }

    const seededSkills = await tx.skill.findMany({
      where: {
        userId: {
          in: seededUserIds
        }
      },
      select: {
        id: true,
        userId: true,
        name: true
      }
    });

    const skillIdByKey = new Map<string, number>();
    for (const skill of seededSkills) {
      const username = seededUsers.find((user) => user.id === skill.userId)?.username;
      if (!username) continue;
      skillIdByKey.set(`${username}:${skill.name}`, skill.id);
    }

    for (const edge of edges) {
      const userId = userIdByUsername.get(edge.username);
      const sourceSkillId = skillIdByKey.get(`${edge.username}:${edge.from}`);
      const targetSkillId = skillIdByKey.get(`${edge.username}:${edge.to}`);

      if (!userId || !sourceSkillId || !targetSkillId) continue;

      await tx.skillEdge.create({
        data: {
          userId,
          sourceSkillId,
          targetSkillId
        }
      });
    }

    for (const vouch of vouches) {
      const voucherId = userIdByUsername.get(vouch.from);
      const recipientId = userIdByUsername.get(vouch.to);
      const skillId = skillIdByKey.get(vouch.skillKey);

      if (!voucherId || !recipientId || !skillId) continue;

      await tx.vouch.create({
        data: {
          voucherId,
          recipientId,
          skillId,
          message: vouch.message
        }
      });
    }

    for (const evidence of skillEvidence) {
      const skillId = skillIdByKey.get(evidence.skillKey);
      const username = evidence.skillKey.split(':')[0];
      const userId = userIdByUsername.get(username);

      if (!skillId || !userId) continue;

      await tx.skillEvidence.create({
        data: {
          skillId,
          userId,
          type: evidence.type,
          title: evidence.title,
          url: evidence.url,
          description: evidence.description,
          impact: evidence.impact,
          issuer: evidence.issuer
        }
      });
    }

    for (const testimonial of testimonials) {
      await tx.testimonial.upsert({
        where: { slug: testimonial.slug },
        update: {
          displayName: testimonial.displayName,
          roleTitle: testimonial.roleTitle,
          quote: testimonial.quote,
          avatarInitials: testimonial.avatarInitials,
          avatarColor: testimonial.avatarColor,
          sortOrder: testimonial.sortOrder
        },
        create: testimonial
      });
    }

    const featuredUserId = userIdByUsername.get('aryan');
    await tx.siteSetting.upsert({
      where: { key: 'landing_featured_user_id' },
      update: {
        valueText: featuredUserId ? String(featuredUserId) : null
      },
      create: {
        key: 'landing_featured_user_id',
        valueText: featuredUserId ? String(featuredUserId) : null
      }
    });
  });

  const allUsers = await prisma.user.findMany({
    select: { id: true }
  });

  for (const user of allUsers) {
    await recomputeMatches(user.id);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
