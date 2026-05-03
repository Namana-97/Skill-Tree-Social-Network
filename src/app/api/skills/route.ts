import { NextRequest } from 'next/server';

import { requireAuth } from '@/lib/auth';
import {
  resolveSkillRuleKey,
  verifyGitHubSkillProof
} from '@/lib/github-proof';
import { fail, ok } from '@/lib/http';
import { recomputeMatches } from '@/lib/matches';
import { applyXpDelta } from '@/lib/progress';
import { prisma } from '@/lib/prisma';
import { publishEvent } from '@/lib/realtime';
import { enqueueSearchSync } from '@/lib/search';
import {
  proofVerificationLimiter,
  withRateLimit
} from '@/middleware/rate-limit';
import { skillSchema, validateRequest } from '@/lib/validation';

const postHandler = async (request: NextRequest) => {
  try {
    const auth = requireAuth(request);
    const rawBody = await request.json();
    const validation = validateRequest(skillSchema, rawBody);

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
    const requestedSkillKey = resolveSkillRuleKey(body.name);
    const proofUrls = [
      body.proof_url || '',
      ...(body.evidence || []).map((item) => item.url)
    ].filter(Boolean);

    const [user, existingSkills] = await Promise.all([
      prisma.user.findUnique({
        where: { id: auth.id },
        select: {
          id: true,
          githubLogin: true,
          githubProfileUrl: true
        }
      }),
      prisma.skill.findMany({
        where: { userId: auth.id },
        select: {
          id: true,
          name: true
        }
      })
    ]);

    if (!user) {
      return fail(404, 'User not found.');
    }

    const duplicate = existingSkills.find((skill) => {
      try {
        return resolveSkillRuleKey(skill.name) === requestedSkillKey;
      } catch {
        return (
          skill.name.trim().toLowerCase() === body.name.trim().toLowerCase()
        );
      }
    });

    if (duplicate) {
      return fail(
        409,
        `You already have "${duplicate.name}". Update it instead.`
      );
    }

    const verification = await verifyGitHubSkillProof({
      user,
      skillName: body.name,
      candidateUrls: proofUrls
    });

    const skill = await prisma.$transaction(async (tx) => {
      const created = await tx.skill.create({
        data: {
          userId: auth.id,
          name: body.name,
          level: verification.derivedLevel,
          color: body.color || '#E63B3B',
          proofUrl: verification.primaryProofUrl
        }
      });

      if (verification.evidence.length) {
        await tx.skillEvidence.createMany({
          data: verification.evidence.map((item) => ({
            skillId: created.id,
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

      await applyXpDelta(auth.id, verification.derivedLevel * 20, tx);
      return created;
    });

    void recomputeMatches(auth.id);
    void enqueueSearchSync('user', String(auth.id), 'upsert');
    publishEvent({
      type: 'skills.created',
      data: { userId: auth.id, skillId: skill.id }
    });

    return ok(skill, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return fail(409, 'You already have this skill. Update it instead.');
    }

    if (error instanceof Error) {
      return fail(400, error.message);
    }

    console.error(error);
    return fail(500, 'Could not add skill.');
  }
};

export const POST = withRateLimit(proofVerificationLimiter, postHandler);
