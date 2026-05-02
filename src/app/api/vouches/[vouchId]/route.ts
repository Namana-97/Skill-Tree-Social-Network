import { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { parseIntParam } from '@/lib/params';
import { applyXpDelta } from '@/lib/progress';
import { prisma } from '@/lib/prisma';
import { publishEvent } from '@/lib/realtime';

type Context = {
  params: Promise<{ vouchId: string }>;
};

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const auth = requireAuth(request);
    const { vouchId: vouchIdParam } = await context.params;
    const vouchId = parseIntParam(vouchIdParam, 'vouch ID');

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.vouch.findFirst({
        where: {
          id: vouchId,
          voucherId: auth.id
        }
      });

      if (!existing) {
        throw new Error('Not your vouch.');
      }

      await tx.vouch.delete({
        where: { id: vouchId }
      });
      await applyXpDelta(existing.recipientId, -15, tx);
      return existing;
    });

    publishEvent({
      type: 'vouches.deleted',
      data: { vouchId, recipientId: deleted.recipientId }
    });

    return ok({ deleted: vouchId });
  } catch (error) {
    if (error instanceof Error && error.message === 'Not your vouch.') {
      return fail(403, error.message);
    }

    console.error(error);
    return fail(500, 'Could not delete vouch.');
  }
}
