type EvidenceLike = {
  id?: number;
  type: string;
  title: string;
  url: string;
  canonicalUrl?: string | null;
  resourceType?: string | null;
  ownerLogin?: string | null;
  repositoryName?: string | null;
  issuer?: string | null;
  description?: string | null;
  impact?: string | null;
  verificationSummary?: string | null;
  verificationScore?: number;
  relevanceScore?: number;
  metadata?: unknown;
  isVerified?: boolean;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type SkillSignalInput = {
  proofUrl?: string | null;
  vouchCount?: number;
  evidence?: EvidenceLike[];
};

export function serializeSkillEvidence(evidence: EvidenceLike) {
  return {
    id: evidence.id,
    type: evidence.type,
    title: evidence.title,
    url: evidence.url,
    canonical_url: evidence.canonicalUrl || null,
    resource_type: evidence.resourceType || null,
    owner_login: evidence.ownerLogin || null,
    repository_name: evidence.repositoryName || null,
    issuer: evidence.issuer || null,
    description: evidence.description || null,
    impact: evidence.impact || null,
    verification_summary: evidence.verificationSummary || null,
    verification_score: evidence.verificationScore || 0,
    relevance_score: evidence.relevanceScore || 0,
    metadata: evidence.metadata || null,
    is_verified: Boolean(evidence.isVerified),
    created_at: evidence.createdAt || null,
    updated_at: evidence.updatedAt || null
  };
}

export function getPrimaryProofUrl(input: SkillSignalInput) {
  return input.proofUrl || input.evidence?.[0]?.url || null;
}

export function calculateSkillTrustScore(input: SkillSignalInput) {
  const evidence = input.evidence || [];
  const vouchCount = input.vouchCount || 0;
  const verifiedEvidence = evidence.filter((item) => item.isVerified);

  if (!verifiedEvidence.length) {
    return Math.min(20, (input.proofUrl ? 8 : 0) + Math.min(12, vouchCount * 2));
  }

  const verificationTotal = verifiedEvidence.reduce((total, item, index) => {
    const multiplier = Math.max(0.45, 1 - index * 0.2);
    return total + (item.verificationScore || 0) * multiplier;
  }, 0);

  const score =
    verificationTotal * 0.8 +
    Math.min(20, verifiedEvidence.length * 6) +
    Math.min(15, vouchCount * 3);

  return Math.min(100, Math.round(score));
}

export function getSkillVerificationStatus(input: SkillSignalInput) {
  const evidence = input.evidence || [];
  if (evidence.some((item) => item.isVerified)) {
    return 'github_verified';
  }
  if (evidence.length || input.proofUrl) {
    return 'proof_unverified';
  }
  return 'no_proof';
}

export function summarizeSkillSignals(input: SkillSignalInput) {
  const evidence = (input.evidence || []).map(serializeSkillEvidence);
  const verifiedEvidenceCount = evidence.filter((item) => item.is_verified).length;
  const strongestEvidence =
    [...evidence].sort(
      (left, right) => (right.verification_score || 0) - (left.verification_score || 0)
    )[0] || null;

  return {
    evidence,
    evidenceCount: evidence.length,
    verifiedEvidenceCount,
    primaryProofUrl: getPrimaryProofUrl(input),
    verificationStatus: getSkillVerificationStatus(input),
    verificationSummary: strongestEvidence?.verification_summary || null,
    trustScore: calculateSkillTrustScore({
      proofUrl: input.proofUrl,
      evidence: input.evidence,
      vouchCount: input.vouchCount
    })
  };
}
