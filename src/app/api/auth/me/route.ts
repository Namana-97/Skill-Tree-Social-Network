import { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        roleTitle: true,
        bio: true,
        avatarInitials: true,
        avatarColor: true,
        xp: true,
        level: true,
        createdAt: true
      }
    });

    if (!user) {
      return fail(404, 'User not found.');
    }

    return ok({
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.displayName,
      role_title: user.roleTitle,
      bio: user.bio,
      avatar_initials: user.avatarInitials,
      avatar_color: user.avatarColor,
      xp: user.xp,
      level: user.level,
      created_at: user.createdAt
    });
  } catch (error) {
    console.error(error);
    return fail(401, 'Unauthorized: Invalid or expired token.');
  }
}
