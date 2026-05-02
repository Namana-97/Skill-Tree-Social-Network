import { NextRequest } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { publishEvent } from '@/lib/realtime';

const schema = z.object({
  source_skill_id: z.number().int(),
  target_skill_id: z.number().int()
});

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const body = schema.parse(await request.json());

    if (body.source_skill_id === body.target_skill_id) {
      return fail(400, 'Cannot connect a skill to itself.');
    }

    const ownedSkills = await prisma.skill.findMany({
      where: {
        userId: auth.id,
        id: {
          in: [body.source_skill_id, body.target_skill_id]
        }
      },
      select: { id: true }
    });

    if (ownedSkills.length < 2) {
      return fail(403, 'Skills must both belong to you.');
    }

    const edge = await prisma.skillEdge.upsert({
      where: {
        userId_sourceSkillId_targetSkillId: {
          userId: auth.id,
          sourceSkillId: body.source_skill_id,
          targetSkillId: body.target_skill_id
        }
      },
      update: {},
      create: {
        userId: auth.id,
        sourceSkillId: body.source_skill_id,
        targetSkillId: body.target_skill_id
      }
    });

    publishEvent({
      type: 'skills.edge.created',
      data: { userId: auth.id, edgeId: edge.id }
    });

    return ok(
      {
        id: edge.id,
        user_id: edge.userId,
        source_skill_id: edge.sourceSkillId,
        target_skill_id: edge.targetSkillId
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(400, error.issues[0]?.message || 'Invalid request.');
    }

    console.error(error);
    return fail(500, 'Could not add edge.');
  }
}
