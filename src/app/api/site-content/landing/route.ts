import { prisma } from '@/lib/prisma';
import { fail, ok } from '@/lib/http';

const FEATURED_USER_SETTING_KEY = 'landing_featured_user_id';

export async function GET() {
  try {
    const [stats, setting, testimonials, ticker] = await Promise.all([
      Promise.all([
        prisma.user.count(),
        prisma.vouch.count(),
        prisma.skill.count()
      ]),
      prisma.siteSetting.findUnique({
        where: { key: FEATURED_USER_SETTING_KEY }
      }),
      prisma.testimonial.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: 3
      }),
      buildTicker()
    ]);

    const featuredUserId = Number.parseInt(setting?.valueText || '', 10);
    const featuredProfile = await loadFeaturedProfile(
      Number.isNaN(featuredUserId) ? undefined : featuredUserId
    );
    const featuredTree = featuredProfile
      ? await loadFeaturedTree(featuredProfile.id)
      : { nodes: [], edges: [] };

    return ok({
      stats: {
        trees: stats[0],
        vouches: stats[1],
        skills: stats[2]
      },
      featured_profile: featuredProfile,
      featured_tree: featuredTree,
      ticker,
      testimonials: testimonials.map((item) => ({
        display_name: item.displayName,
        role_title: item.roleTitle,
        quote: item.quote,
        avatar_initials: item.avatarInitials,
        avatar_color: item.avatarColor
      }))
    });
  } catch (error) {
    console.error(error);
    return fail(500, 'Could not load landing content.');
  }
}

async function loadFeaturedProfile(configuredId?: number) {
  const featuredUser =
    (configuredId
      ? await prisma.user.findUnique({ where: { id: configuredId } })
      : null) ||
    (await prisma.user.findFirst({
      orderBy: [{ level: 'desc' }, { xp: 'desc' }, { createdAt: 'asc' }]
    }));

  if (!featuredUser) return null;

  const [totalVouches, recentVouches] = await Promise.all([
    prisma.vouch.count({ where: { recipientId: featuredUser.id } }),
    prisma.vouch.count({
      where: {
        recipientId: featuredUser.id,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    })
  ]);

  return {
    id: featuredUser.id,
    display_name: featuredUser.displayName,
    role_title: featuredUser.roleTitle,
    avatar_initials: featuredUser.avatarInitials,
    avatar_color: featuredUser.avatarColor,
    level: featuredUser.level,
    xp: featuredUser.xp,
    total_vouches: totalVouches,
    recent_vouches: recentVouches
  };
}

async function loadFeaturedTree(userId: number) {
  const nodes = await prisma.skill.findMany({
    where: { userId },
    orderBy: [{ level: 'desc' }, { name: 'asc' }],
    take: 7,
    include: {
      _count: {
        select: { vouches: true }
      }
    }
  });

  const nodeIds = nodes.map((node) => node.id);
  const edges = await prisma.skillEdge.findMany({
    where: {
      userId,
      sourceSkillId: { in: nodeIds },
      targetSkillId: { in: nodeIds }
    }
  });

  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      name: node.name,
      level: node.level,
      color: node.color,
      vouch_count: node._count.vouches
    })),
    edges: edges.map((edge) => ({
      source: edge.sourceSkillId,
      target: edge.targetSkillId
    }))
  };
}

async function buildTicker() {
  const [recentVouches, recentSkills, recentMatchesRaw] = await Promise.all([
    prisma.vouch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        voucher: true,
        skill: true
      }
    }),
    prisma.skill.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        user: true
      }
    }),
    prisma.match.findMany({
      orderBy: { computedAt: 'desc' },
      take: 10,
      include: {
        userA: true
      }
    })
  ]);

  const items = [
    ...recentVouches.map((item) => ({
      who: item.voucher.displayName,
      what: `Vouched ${item.skill.name} · Lv.${item.skill.level}`,
      happenedAt: item.createdAt
    })),
    ...recentSkills.map((item) => ({
      who: item.user.displayName,
      what: `Added ${item.name} · Lv.${item.level}`,
      happenedAt: item.createdAt
    })),
    ...recentMatchesRaw
      .filter((item) => item.userAId < item.userBId)
      .slice(0, 2)
      .map((item) => ({
      who: item.userA.displayName,
      what: 'Found complement match',
      happenedAt: item.computedAt
      }))
  ];

  return items
    .sort((left, right) => right.happenedAt.getTime() - left.happenedAt.getTime())
    .slice(0, 6)
    .map(({ who, what }) => ({ who, what }));
}
