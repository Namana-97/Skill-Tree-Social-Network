import { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { parseIntParam } from '@/lib/params';
import { prisma } from '@/lib/prisma';

type Context = {
  params: Promise<{ userId: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  try {
    const auth = requireAuth(request);
    const { userId: userIdParam } = await context.params;
    const userId = parseIntParam(userIdParam, 'user ID');

    if (auth.id !== userId) {
      return fail(403, 'You can only view your own matches.');
    }

    const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '10', 10) || 10;
    const [matches, mySkills] = await Promise.all([
      prisma.match.findMany({
        where: { userAId: userId },
        orderBy: { score: 'desc' },
        take: limit,
        include: {
          userB: {
            include: {
              skills: {
                orderBy: [{ level: 'desc' }, { name: 'asc' }]
              },
              _count: {
                select: { receivedVouches: true }
              }
            }
          }
        }
      }),
      prisma.skill.findMany({
        where: { userId },
        select: { name: true, level: true }
      })
    ]);

    const myNames = new Set(mySkills.map((skill) => skill.name));

    return ok(
      matches.map((item) => {
        const theirSkills = item.userB.skills.map((skill) => ({
          name: skill.name,
          level: skill.level,
          color: skill.color
        }));
        const theirNames = new Set(theirSkills.map((skill) => skill.name));

        return {
          score: Number(item.score),
          computed_at: item.computedAt,
          id: item.userB.id,
          display_name: item.userB.displayName,
          role_title: item.userB.roleTitle,
          avatar_initials: item.userB.avatarInitials,
          avatar_color: item.userB.avatarColor,
          level: item.userB.level,
          their_skills: theirSkills,
          vouch_count: item.userB._count.receivedVouches,
          fills_your_gaps: theirSkills.filter((skill) => !myNames.has(skill.name)),
          you_fill_theirs: mySkills.filter((skill) => !theirNames.has(skill.name)),
          shared_skills: theirSkills.filter((skill) => myNames.has(skill.name))
        };
      })
    );
  } catch (error) {
    console.error(error);
    return fail(401, 'Unauthorized: Invalid or expired token.');
  }
}
