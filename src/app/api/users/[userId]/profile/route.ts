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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        roleTitle: true,
        bio: true,
        avatarInitials: true,
        avatarColor: true,
        level: true,
        xp: true,
        createdAt: true
      }
    });

    if (!user) {
      return fail(404, 'User not found.');
    }

    const [skills, totalVouches] = await Promise.all([
      prisma.skill.findMany({
        where: { userId },
        orderBy: { level: 'desc' },
        include: {
          evidence: {
            orderBy: [{ isVerified: 'desc' }, { createdAt: 'asc' }]
          },
          _count: {
            select: { vouches: true }
          }
        }
      }),
      prisma.vouch.count({
        where: { recipientId: userId }
      })
    ]);

    return ok({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.displayName,
        role_title: user.roleTitle,
        bio: user.bio,
        avatar_initials: user.avatarInitials,
        avatar_color: user.avatarColor,
        level: user.level,
        xp: user.xp,
        created_at: user.createdAt
      },
      skills: skills.map((skill) => {
        const signals = summarizeSkillSignals({
          proofUrl: skill.proofUrl,
          evidence: skill.evidence,
          vouchCount: skill._count.vouches
        });

        return {
          id: skill.id,
          user_id: skill.userId,
          name: skill.name,
          level: skill.level,
          level_source: getSkillLevelSource(skill.evidence),
          color: skill.color,
          proof_url: skill.proofUrl,
          primary_proof_url: signals.primaryProofUrl,
          created_at: skill.createdAt,
          updated_at: skill.updatedAt,
          vouch_count: skill._count.vouches,
          evidence_count: signals.evidenceCount,
          verified_evidence_count: signals.verifiedEvidenceCount,
          verification_status: signals.verificationStatus,
          verification_summary: signals.verificationSummary,
          trust_score: signals.trustScore,
          evidence: signals.evidence
        };
      }),
      total_vouches: totalVouches
    });
  } catch (error) {
    console.error(error);
    return fail(500, 'Could not load profile.');
  }
}
