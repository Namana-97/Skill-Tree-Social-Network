import { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { fail, ok } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { publishEvent } from '@/lib/realtime';
import { apiLimiter, withRateLimit } from '@/middleware/rate-limit';
import { edgeSchema, validateRequest } from '@/lib/validation';

const postHandler = async (request: NextRequest) => {
  try {
    const auth = requireAuth(request);
    const rawBody = await request.json();
    const validation = validateRequest(edgeSchema, rawBody);

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
    console.error(error);
    return fail(500, 'Could not add edge.');
  }
};

export const POST = withRateLimit(apiLimiter, postHandler);
