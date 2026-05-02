import { NextRequest } from 'next/server';

import { optionalAuth } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const auth = optionalAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q')?.trim();
    const skill = searchParams.get('skill')?.trim();
    const role = searchParams.get('role')?.trim();
    const sort = searchParams.get('sort') || 'level';
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20)
    );

    const users = await prisma.user.findMany({
      where: {
        ...(auth?.id ? { id: { not: auth.id } } : {}),
        ...(role
          ? {
              roleTitle: {
                contains: role,
                mode: 'insensitive'
              }
            }
          : {}),
        ...(q
          ? {
              OR: [
                {
                  displayName: {
                    contains: q,
                    mode: 'insensitive'
                  }
                },
                {
                  username: {
                    contains: q,
                    mode: 'insensitive'
                  }
                },
                {
                  roleTitle: {
                    contains: q,
                    mode: 'insensitive'
                  }
                },
                {
                  skills: {
                    some: {
                      name: {
                        contains: q,
                        mode: 'insensitive'
                      }
                    }
                  }
                }
              ]
            }
          : {}),
        ...(skill
          ? {
              skills: {
                some: {
                  name: {
                    contains: skill,
                    mode: 'insensitive'
                  }
                }
              }
            }
          : {})
      },
      include: {
        skills: {
          orderBy: [{ level: 'desc' }, { name: 'asc' }]
        },
        _count: {
          select: { receivedVouches: true }
        }
      }
    });

    const pageSlice = users.slice((page - 1) * limit, page * limit);
    const matchMap =
      auth?.id && pageSlice.length
        ? new Map(
            (
              await prisma.match.findMany({
                where: {
                  userAId: auth.id,
                  userBId: {
                    in: pageSlice.map((user) => user.id)
                  }
                }
              })
            ).map((item) => [item.userBId, Number(item.score)])
          )
        : new Map<number, number>();

    const rows = pageSlice.map((user) => ({
      id: user.id,
      display_name: user.displayName,
      username: user.username,
      role_title: user.roleTitle,
      avatar_initials: user.avatarInitials,
      avatar_color: user.avatarColor,
      level: user.level,
      xp: user.xp,
      skills: user.skills.map((entry) => ({
        name: entry.name,
        level: entry.level,
        color: entry.color
      })),
      vouch_count: user._count.receivedVouches,
      ...(auth?.id ? { match_score: matchMap.get(user.id) ?? null } : {})
    }));

    rows.sort((left, right) => {
      if (sort === 'vouches') return right.vouch_count - left.vouch_count;
      if (sort === 'newest') return right.id - left.id;
      if (sort === 'match' && auth?.id) {
        return (Number(right.match_score) || -1) - (Number(left.match_score) || -1);
      }
      return right.level - left.level;
    });

    return ok(rows);
  } catch (error) {
    console.error(error);
    return fail(500, 'Discover query failed.');
  }
}
