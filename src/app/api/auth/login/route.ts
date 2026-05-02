import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { signToken } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email }
    });

    if (!user) {
      return fail(401, 'Invalid credentials.');
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return fail(401, 'Invalid credentials.');
    }

    return ok({
      token: signToken({
        id: user.id,
        username: user.username,
        email: user.email
      }),
      user: {
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
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(400, error.issues[0]?.message || 'Invalid request.');
    }

    console.error(error);
    return fail(500, 'Login failed.');
  }
}
