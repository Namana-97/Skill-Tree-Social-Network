import { NextRequest } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { queueEmailNotification } from '@/lib/email';
import { resolveSkillRuleKey } from '@/lib/github-proof';
import { fail, ok } from '@/lib/http';
import { applyXpDelta } from '@/lib/progress';
import { prisma } from '@/lib/prisma';
import { publishEvent } from '@/lib/realtime';

const schema = z.object({
  skill_id: z.number().int(),
  message: z.string().trim().optional().default('')
});

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const body = schema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.skill.findUnique({
        where: { id: body.skill_id }
      });

      if (!target) {
        throw new Error('Skill not found.');
      }
      if (target.userId === auth.id) {
        throw new Error('You cannot vouch your own skill.');
      }

      const targetSkillKey = resolveComparableSkillKey(target.name);
      const mySkills = await tx.skill.findMany({
        where: {
          userId: auth.id
        },
        select: {
          name: true,
          level: true
        }
      });

      const mySkill =
        [...mySkills]
          .filter((skill) => resolveComparableSkillKey(skill.name) === targetSkillKey)
          .sort((left, right) => right.level - left.level)[0] || null;

      if (!mySkill || mySkill.level < target.level) {
        throw new Error(
          `You must hold "${target.name}" at level ${target.level} or higher to vouch for it.`
        );
      }

      const created = await tx.vouch.create({
        data: {
          voucherId: auth.id,
          recipientId: target.userId,
          skillId: body.skill_id,
          message: body.message || null
        }
      });

      await applyXpDelta(target.userId, 15, tx);
      return { created, target };
    });

    const recipient = await prisma.user.findUnique({
      where: { id: result.target.userId },
      select: { displayName: true }
    });

    void queueEmailNotification({
      userId: result.target.userId,
      type: 'vouch_received',
      subject: 'You received a new vouch on SkillForge',
      html: `<p>${recipient?.displayName || 'You'} received a new vouch for ${result.target.name}.</p>`
    });

    publishEvent({
      type: 'vouches.created',
      data: { skillId: result.target.id, recipientId: result.target.userId }
    });

    return ok(result.created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(400, error.issues[0]?.message || 'Invalid request.');
    }
    if (error instanceof Error) {
      if (error.message === 'Skill not found.') return fail(404, error.message);
      if (error.message === 'You cannot vouch your own skill.') return fail(400, error.message);
      if (error.message.includes('You must hold')) return fail(403, error.message);
    }
    if ((error as { code?: string }).code === 'P2002') {
      return fail(409, 'You already vouched for this skill.');
    }

    console.error(error);
    return fail(500, 'Could not create vouch.');
  }
}

function resolveComparableSkillKey(skillName: string) {
  return resolveSkillRuleKey(skillName) || skillName.trim().toLowerCase();
}
