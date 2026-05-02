import { NextRequest } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { verifyGitHubSkillProof } from '@/lib/github-proof';
import { fail, ok } from '@/lib/http';
import { recomputeMatches } from '@/lib/matches';
import { parseIntParam } from '@/lib/params';
import { applyXpDelta } from '@/lib/progress';
import { prisma } from '@/lib/prisma';
import { publishEvent } from '@/lib/realtime';
import { enqueueSearchSync } from '@/lib/search';

const evidenceTypeValues = [
  'profile',
  'repo',
  'commit',
  'project',
  'pull_request',
  'demo',
  'case_study',
  'certification',
  'article',
  'work_sample'
] as const;

const evidenceSchema = z.object({
  type: z.enum(evidenceTypeValues),
  title: z.string().trim().max(120).optional().nullable(),
  url: z.string().url(),
  issuer: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  impact: z.string().trim().max(255).optional().nullable(),
  is_verified: z.boolean().optional()
});

const schema = z.object({
  level: z.number().int().min(1).max(5).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  proof_url: z.string().url().optional().nullable(),
  evidence: z.array(evidenceSchema).max(6).optional()
});

type Context = {
  params: Promise<{ skillId: string }>;
};

export async function PUT(request: NextRequest, context: Context) {
  try {
    const auth = requireAuth(request);
    const { skillId: skillIdParam } = await context.params;
    const skillId = parseIntParam(skillIdParam, 'skill ID');
    const body = schema.parse(await request.json());

    const [user, existing] = await Promise.all([
      prisma.user.findUnique({
        where: { id: auth.id },
        select: {
          id: true,
          githubLogin: true,
          githubProfileUrl: true
        }
      }),
      prisma.skill.findFirst({
        where: { id: skillId, userId: auth.id },
        include: {
          evidence: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })
    ]);

    if (!user) {
      return fail(404, 'User not found.');
    }
    if (!existing) {
      return fail(403, 'Not your skill.');
    }

    const providedProofUrls = [
      body.proof_url || '',
      ...(body.evidence || []).map((item) => item.url)
    ].filter(Boolean);
    const shouldReverify = providedProofUrls.length > 0;

    const verification = shouldReverify
      ? await verifyGitHubSkillProof({
          user,
          skillName: existing.name,
          candidateUrls: providedProofUrls
        })
      : null;

    const updated = await prisma.$transaction(async (tx) => {
      if (!existing.proofUrl && !existing.evidence.some((item) => item.isVerified) && !verification) {
        throw new Error('A public GitHub proof link is required for every skill.');
      }

      if (verification) {
        await tx.skillEvidence.deleteMany({
          where: { skillId, userId: auth.id }
        });

        if (verification.evidence.length) {
          await tx.skillEvidence.createMany({
            data: verification.evidence.map((item) => ({
              skillId,
              userId: auth.id,
              type: item.type,
              title: item.title,
              url: item.url,
              canonicalUrl: item.canonicalUrl,
              resourceType: item.resourceType,
              ownerLogin: item.ownerLogin,
              repositoryName: item.repositoryName,
              issuer: item.issuer,
              description: item.description,
              impact: item.impact,
              verificationSummary: item.verificationSummary,
              verificationScore: item.verificationScore,
              relevanceScore: item.relevanceScore,
              metadata: item.metadata,
              isVerified: item.isVerified
            }))
          });
        }

        await tx.user.update({
          where: { id: auth.id },
          data: {
            githubLogin: verification.githubLogin,
            githubProfileUrl: verification.githubProfileUrl,
            githubVerifiedAt: new Date()
          }
        });
      }

      const nextLevel = verification ? verification.derivedLevel : existing.level;
      const result = await tx.skill.update({
        where: { id: skillId },
        data: {
          level: nextLevel,
          color: body.color ?? existing.color,
          proofUrl: verification ? verification.primaryProofUrl : existing.proofUrl,
          updatedAt: new Date()
        }
      });

      const xpDelta = (nextLevel - existing.level) * 20;
      if (xpDelta !== 0) {
        await applyXpDelta(auth.id, xpDelta, tx);
      }

      return result;
    });

    void recomputeMatches(auth.id);
    void enqueueSearchSync('user', String(auth.id), 'upsert');
    publishEvent({
      type: 'skills.updated',
      data: { userId: auth.id, skillId }
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(400, error.issues[0]?.message || 'Invalid request.');
    }
    if (error instanceof Error) {
      if (error.message === 'Not your skill.') {
        return fail(403, 'Not your skill.');
      }
      return fail(400, error.message);
    }

    console.error(error);
    return fail(500, 'Could not update skill.');
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const auth = requireAuth(request);
    const { skillId: skillIdParam } = await context.params;
    const skillId = parseIntParam(skillIdParam, 'skill ID');

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.skill.findFirst({
        where: { id: skillId, userId: auth.id }
      });

      if (!existing) {
        throw new Error('Not your skill.');
      }

      await tx.skill.delete({
        where: { id: skillId }
      });

      await applyXpDelta(auth.id, -existing.level * 20, tx);
      return existing;
    });

    void recomputeMatches(auth.id);
    void enqueueSearchSync('user', String(auth.id), 'upsert');
    publishEvent({
      type: 'skills.deleted',
      data: { userId: auth.id, skillId: deleted.id }
    });

    return ok({ deleted: skillId });
  } catch (error) {
    if (error instanceof Error && error.message === 'Not your skill.') {
      return fail(403, 'Not your skill.');
    }

    console.error(error);
    return fail(500, 'Could not delete skill.');
  }
}
