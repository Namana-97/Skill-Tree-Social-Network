import { prisma } from '@/lib/prisma';

type ProgressClient = Pick<typeof prisma, 'user'>;

export function calculateLevel(xp: number) {
  return Math.max(1, Math.ceil(xp / 100));
}

export async function applyXpDelta(
  userId: number,
  delta: number,
  tx: ProgressClient = prisma
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { xp: true }
  });

  if (!user) {
    throw new Error('User not found.');
  }

  const nextXp = Math.max(0, user.xp + delta);
  const nextLevel = calculateLevel(nextXp);

  return tx.user.update({
    where: { id: userId },
    data: {
      xp: nextXp,
      level: nextLevel
    }
  });
}
