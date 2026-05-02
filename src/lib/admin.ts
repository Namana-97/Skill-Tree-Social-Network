import { prisma } from '@/lib/prisma';

export async function assertAdmin(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  });

  if (!user?.isAdmin) {
    throw new Error('Admin access required.');
  }
}
