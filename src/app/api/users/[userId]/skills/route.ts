import { fail, ok } from '@/lib/http';
import { parseIntParam } from '@/lib/params';
import { prisma } from '@/lib/prisma';
import { getSkillLevelSource } from '@/lib/skill-levels';
import { summarizeSkillSignals } from '@/lib/skill-signals';

type Context = {
  params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { userId: userIdParam } = await context.params;
    const userId = parseIntParam(userIdParam, 'user ID');

    const [nodes, edges] = await Promise.all([
      prisma.skill.findMany({
        where: { userId },
        orderBy: [{ level: 'desc' }, { name: 'asc' }],
        include: {
          evidence: {
            orderBy: [{ isVerified: 'desc' }, { createdAt: 'asc' }]
          },
          _count: {
            select: { vouches: true }
          }
        }
      }),
      prisma.skillEdge.findMany({
        where: { userId }
      })
    ]);

    return ok({
      nodes: nodes.map((node) => {
        const signals = summarizeSkillSignals({
          proofUrl: node.proofUrl,
          evidence: node.evidence,
          vouchCount: node._count.vouches
        });

        return {
          id: node.id,
          name: node.name,
          level: node.level,
          level_source: getSkillLevelSource(node.evidence),
          color: node.color,
          proof_url: node.proofUrl,
          primary_proof_url: signals.primaryProofUrl,
          created_at: node.createdAt,
          vouch_count: node._count.vouches,
          evidence_count: signals.evidenceCount,
          verified_evidence_count: signals.verifiedEvidenceCount,
          verification_status: signals.verificationStatus,
          verification_summary: signals.verificationSummary,
          trust_score: signals.trustScore,
          evidence: signals.evidence
        };
      }),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceSkillId,
        target: edge.targetSkillId
      }))
    });
  } catch (error) {
    console.error(error);
    return fail(500, 'Could not fetch skill tree.');
  }
}
