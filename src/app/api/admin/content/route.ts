import { NextRequest } from 'next/server';
import { z } from 'zod';

import { assertAdmin } from '@/lib/admin';
import { requireAuth } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  featuredUserId: z.number().int().optional(),
  testimonials: z
    .array(
      z.object({
        slug: z.string().min(1).max(80),
        displayName: z.string().min(1).max(80),
        roleTitle: z.string().max(120).optional().nullable(),
        quote: z.string().min(1),
        avatarInitials: z.string().max(3).optional().nullable(),
        avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
        sortOrder: z.number().int().default(0)
      })
    )
    .optional()
});

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    await assertAdmin(auth.id);

    const [featuredUser, testimonials] = await Promise.all([
      prisma.siteSetting.findUnique({
        where: { key: 'landing_featured_user_id' }
      }),
      prisma.testimonial.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      })
    ]);

    return ok({
      featuredUserId: featuredUser?.valueText || null,
      testimonials
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required.') {
      return fail(403, error.message);
    }
    console.error(error);
    return fail(500, 'Could not load content settings.');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    await assertAdmin(auth.id);
    const body = schema.parse(await request.json());

    await prisma.$transaction(async (tx) => {
      if (body.featuredUserId) {
        await tx.siteSetting.upsert({
          where: { key: 'landing_featured_user_id' },
          update: { valueText: String(body.featuredUserId), updatedAt: new Date() },
          create: { key: 'landing_featured_user_id', valueText: String(body.featuredUserId) }
        });
      }

      if (body.testimonials) {
        for (const item of body.testimonials) {
          await tx.testimonial.upsert({
            where: { slug: item.slug },
            update: {
              displayName: item.displayName,
              roleTitle: item.roleTitle || null,
              quote: item.quote,
              avatarInitials: item.avatarInitials || null,
              avatarColor: item.avatarColor || '#E63B3B',
              sortOrder: item.sortOrder
            },
            create: {
              slug: item.slug,
              displayName: item.displayName,
              roleTitle: item.roleTitle || null,
              quote: item.quote,
              avatarInitials: item.avatarInitials || null,
              avatarColor: item.avatarColor || '#E63B3B',
              sortOrder: item.sortOrder
            }
          });
        }
      }
    });

    return ok({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(400, error.issues[0]?.message || 'Invalid request.');
    }
    if (error instanceof Error && error.message === 'Admin access required.') {
      return fail(403, error.message);
    }
    console.error(error);
    return fail(500, 'Could not update content settings.');
  }
}
