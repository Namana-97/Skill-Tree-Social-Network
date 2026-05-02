import { fail, ok } from '@/lib/http';
import { parseIntParam } from '@/lib/params';
import { prisma } from '@/lib/prisma';

type Context = {
  params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { userId: userIdParam } = await context.params;
    const userId = parseIntParam(userIdParam, 'user ID');

    const vouches = await prisma.vouch.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        skill: true,
        voucher: true
      }
    });

    return ok(
      vouches.map((item) => ({
        id: item.id,
        message: item.message,
        created_at: item.createdAt,
        skill_name: item.skill.name,
        skill_level: item.skill.level,
        color: item.skill.color,
        voucher_name: item.voucher.displayName,
        avatar_initials: item.voucher.avatarInitials,
        avatar_color: item.voucher.avatarColor
      }))
    );
  } catch (error) {
    console.error(error);
    return fail(500, 'Could not fetch vouches.');
  }
}
