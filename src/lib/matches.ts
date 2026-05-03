import { prisma } from '@/lib/prisma';
import { publishEvent } from '@/lib/realtime';

function normalizeSkillName(name: string) {
  return name.trim().toLowerCase();
}

export function computeComplementScore(userA: string[], userB: string[]) {
  const left = new Set(userA.map(normalizeSkillName).filter(Boolean));
  const right = new Set(userB.map(normalizeSkillName).filter(Boolean));
  const totalUnique = new Set([...left, ...right]).size;

  if (!totalUnique) return 0;

  let overlap = 0;
  for (const skill of left) {
    if (right.has(skill)) {
      overlap += 1;
    }
  }

  const nonOverlapping = totalUnique - overlap;
  return Math.round((nonOverlapping / totalUnique) * 100);
}

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

  const myNames = new Set(mine.map((skill) => normalizeSkillName(skill.name)));
  const myNamesList = [...myNames];
  const skillsByUser = new Map<number, string[]>(
    others.map((user) => [user.id, [] as string[]])
  );

  for (const row of otherSkills) {
    const list = skillsByUser.get(row.userId) ?? [];
    list.push(normalizeSkillName(row.name));
    skillsByUser.set(row.userId, list);
  }

  await prisma.match.deleteMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }]
    }
  });

  for (const [otherId, names] of skillsByUser.entries()) {
    const score = computeComplementScore(myNamesList, names);

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
