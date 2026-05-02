import { prisma } from '@/lib/prisma';

type ProgressClient = Pick<typeof prisma, 'user'>;

export async function applyXpDelta(userId: number, delta: number, tx: ProgressClient = prisma) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { xp: true }
  });

  if (!user) {
    throw new Error('User not found.');
  }

  const nextXp = Math.max(0, user.xp + delta);
  const nextLevel = Math.max(1, Math.ceil(nextXp / 100));

  await tx.user.update({
    where: { id: userId },
    data: {
      xp: nextXp,
      level: nextLevel
    }
  });
}
