import { hashPassword, signToken } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { authLimiter, withRateLimit } from '@/middleware/rate-limit';
import { registerSchema, validateRequest } from '@/lib/validation';

const postHandler = async (request: Request) => {
  try {
    const rawBody = await request.json();
    const validation = validateRequest(registerSchema, rawBody);

    if (!validation.success) {
      return Response.json(
        {
          error: 'Validation failed',
          details: validation.errors?.issues
        },
        { status: 400 }
      );
    }

    const body = validation.data;

    const exists = await prisma.user.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.username }]
      },
      select: { id: true }
    });

    if (exists) {
      return fail(409, 'Username or email already taken.');
    }

    const passwordHash = await hashPassword(body.password);
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
    console.error(error);
    return fail(500, 'Registration failed.');
  }
};

export const POST = withRateLimit(authLimiter, postHandler);
