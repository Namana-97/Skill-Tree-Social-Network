import { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { parseIntParam } from '@/lib/params';
import { prisma } from '@/lib/prisma';
import { publishEvent } from '@/lib/realtime';

type Context = {
  params: Promise<{ edgeId: string }>;
};

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const auth = requireAuth(request);
    const { edgeId: edgeIdParam } = await context.params;
    const edgeId = parseIntParam(edgeIdParam, 'edge ID');

    const existing = await prisma.skillEdge.findFirst({
      where: {
        id: edgeId,
        userId: auth.id
      }
    });

    if (!existing) {
      return fail(403, 'Not your edge.');
    }

    await prisma.skillEdge.delete({
      where: { id: edgeId }
    });

    publishEvent({
      type: 'skills.edge.deleted',
      data: { userId: auth.id, edgeId }
    });

    return ok({ deleted: edgeId });
  } catch (error) {
    console.error(error);
    return fail(500, 'Could not delete edge.');
  }
}
