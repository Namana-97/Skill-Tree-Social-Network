import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { signToken } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  username: z.string().trim().min(3).max(40),
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().trim().min(1),
  role_title: z.string().trim().optional().default('')
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const exists = await prisma.user.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.username }]
      },
      select: { id: true }
    });

    if (exists) {
      return fail(409, 'Username or email already taken.');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const initials = body.display_name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    const user = await prisma.user.create({
      data: {
        username: body.username,
        email: body.email,
        passwordHash,
        displayName: body.display_name,
        roleTitle: body.role_title,
        avatarInitials: initials
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        roleTitle: true,
        level: true,
        xp: true
      }
    });

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
        level: user.level,
        xp: user.xp
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(400, error.issues[0]?.message || 'Invalid request.');
    }

    console.error(error);
    return fail(500, 'Registration failed.');
  }
}
