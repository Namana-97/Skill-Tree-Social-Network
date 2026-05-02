type EvidenceLike = {
  type: string;
  title?: string | null;
  url?: string | null;
  issuer?: string | null;
  description?: string | null;
  impact?: string | null;
  verificationScore?: number;
  isVerified?: boolean;
};

type ResolveSkillLevelInput = {
  requestedLevel?: number | null;
  fallbackLevel?: number | null;
  evidence?: EvidenceLike[];
};

const EVIDENCE_TYPE_WEIGHTS: Record<string, number> = {
  repo: 26,
  project: 28,
  pull_request: 18,
  demo: 20,
  case_study: 24,
  certification: 22,
  article: 16,
  work_sample: 24
};

function scoreEvidenceItem(item: EvidenceLike) {
  let score = EVIDENCE_TYPE_WEIGHTS[item.type] || 18;

  if (item.title) score += 4;
  if (item.url) score += 4;
  if (item.description) score += 8;
  if (item.impact) score += 10;
  if (item.issuer) score += 4;
  if (item.isVerified) score += 16;

  return score;
}

export function calculateEvidenceStrength(evidence: EvidenceLike[] = []) {
  return evidence.reduce((total, item, index) => {
    const multiplier = Math.max(0.35, 1 - index * 0.2);
    return total + scoreEvidenceItem(item) * multiplier;
  }, 0);
}

export function deriveSkillLevelFromEvidence(evidence: EvidenceLike[] = []) {
  if (!evidence.length) return null;

  const score = calculateEvidenceStrength(evidence);

  if (score >= 125) return 5;
  if (score >= 85) return 4;
  if (score >= 50) return 3;
  if (score >= 20) return 2;
  return 1;
}

export function resolveSkillLevel(input: ResolveSkillLevelInput) {
  const derivedLevel = deriveSkillLevelFromEvidence(input.evidence || []);

  if (derivedLevel !== null) {
    return derivedLevel;
  }

  return input.requestedLevel ?? input.fallbackLevel ?? 1;
}

export function getSkillLevelSource(evidence: EvidenceLike[] = []) {
  return evidence.some((item) => item.isVerified) ? 'github' : 'manual';
}
