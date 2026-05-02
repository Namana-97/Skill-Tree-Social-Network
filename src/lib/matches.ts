import { prisma } from '@/lib/prisma';
import { publishEvent } from '@/lib/realtime';

export async function recomputeMatches(userId: number) {
  const [mine, others, otherSkills] = await Promise.all([
    prisma.skill.findMany({
      where: { userId },
      select: { name: true }
    }),
    prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true }
    }),
    prisma.skill.findMany({
      where: { userId: { not: userId } },
      select: { userId: true, name: true }
    })
  ]);

  const myNames = new Set(mine.map((skill) => skill.name));
  const myNamesList = [...myNames];
  const skillsByUser = new Map<number, string[]>(
    others.map((user) => [user.id, [] as string[]])
  );

  for (const row of otherSkills) {
    const list = skillsByUser.get(row.userId) ?? [];
    list.push(row.name);
    skillsByUser.set(row.userId, list);
  }

  await prisma.match.deleteMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }]
    }
  });

  for (const [otherId, names] of skillsByUser.entries()) {
    const theirNames = new Set(names);
    const theirNamesList = [...theirNames];
    const theyFill = theirNamesList.filter((name) => !myNames.has(name)).length;
    const youFill = myNamesList.filter((name) => !theirNames.has(name)).length;
    const total = new Set([...myNamesList, ...theirNamesList]).size;
    const score = total > 0 ? Math.round(((theyFill + youFill) / total) * 100) : 0;

    await prisma.match.upsert({
      where: {
        userAId_userBId: {
          userAId: userId,
          userBId: otherId
        }
      },
      update: {
        score,
        computedAt: new Date()
      },
      create: {
        userAId: userId,
        userBId: otherId,
        score,
        computedAt: new Date()
      }
    });

    await prisma.match.upsert({
      where: {
        userAId_userBId: {
          userAId: otherId,
          userBId: userId
        }
      },
      update: {
        score,
        computedAt: new Date()
      },
      create: {
        userAId: otherId,
        userBId: userId,
        score,
        computedAt: new Date()
      }
    });
  }

  publishEvent({
    type: 'matches.recomputed',
    data: { userId }
  });
}
