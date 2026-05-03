type TrustScoreInput = {
  evidenceCount: number;
  verifiedCount: number;
  vouchCount: number;
};

type GithubStatsInput = {
  commits?: number;
  stars?: number;
  forks?: number;
  contributors?: number;
};

export function calculateTrustScore(input: TrustScoreInput) {
  const evidenceCount = Math.max(0, input.evidenceCount || 0);
  const verifiedCount = Math.max(0, input.verifiedCount || 0);
  const vouchCount = Math.max(0, input.vouchCount || 0);

  if (!evidenceCount && !verifiedCount && !vouchCount) {
    return 0;
  }

  const weighted =
    evidenceCount * 8 +
    verifiedCount * 16 +
    Math.min(verifiedCount, evidenceCount) * 6 +
    vouchCount * 4;

  return Math.max(0, Math.min(100, Math.round(weighted)));
}

export function deriveSkillLevel(input: GithubStatsInput) {
  const commits = Math.max(0, input.commits || 0);
  const stars = Math.max(0, input.stars || 0);
  const forks = Math.max(0, input.forks || 0);
  const contributors = Math.max(0, input.contributors || 0);

  const score =
    commits * 0.025 + stars * 0.11 + forks * 0.18 + contributors * 1.2;

  if (score >= 220) return 10;
  if (score >= 170) return 9;
  if (score >= 130) return 8;
  if (score >= 100) return 7;
  if (score >= 75) return 6;
  if (score >= 52) return 5;
  if (score >= 34) return 4;
  if (score >= 20) return 3;
  if (score >= 8) return 2;
  return 1;
}
