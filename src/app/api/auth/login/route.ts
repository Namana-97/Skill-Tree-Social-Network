import { signToken, verifyPassword } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { authLimiter, withRateLimit } from '@/middleware/rate-limit';
import { loginSchema, validateRequest } from '@/lib/validation';

const postHandler = async (request: Request) => {
  try {
    const rawBody = await request.json();
    const validation = validateRequest(loginSchema, rawBody);

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

    const user = await prisma.user.findFirst({
      where: body.email
        ? {
            OR: [{ email: body.email }, { username: body.email }]
          }
        : {
            username: body.username
          }
    });

    if (!user) {
      return fail(401, 'Invalid credentials.');
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
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
    console.error(error);
    return fail(500, 'Login failed.');
  }
};

export const POST = withRateLimit(authLimiter, postHandler);
