import { calculateTrustScore, deriveSkillLevel } from '@/lib/skill-scoring';

describe('Skill Scoring', () => {
  describe('calculateTrustScore', () => {
    it('calculates trust score from evidence', () => {
      const evidence = {
        evidenceCount: 3,
        verifiedCount: 2,
        vouchCount: 5
      };

      const score = calculateTrustScore(evidence);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns a higher score for more verified evidence', () => {
      const low = calculateTrustScore({
        evidenceCount: 1,
        verifiedCount: 0,
        vouchCount: 0
      });

      const high = calculateTrustScore({
        evidenceCount: 5,
        verifiedCount: 5,
        vouchCount: 10
      });

      expect(high).toBeGreaterThan(low);
    });

    it('handles zero evidence gracefully', () => {
      const score = calculateTrustScore({
        evidenceCount: 0,
        verifiedCount: 0,
        vouchCount: 0
      });

      expect(score).toBe(0);
    });
  });

  describe('deriveSkillLevel', () => {
    it('derives a level from GitHub stats', () => {
      const stats = {
        commits: 100,
        stars: 50,
        forks: 10,
        contributors: 5
      };

      const level = deriveSkillLevel(stats);

      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(10);
    });

    it('returns a higher level for stronger stats', () => {
      const lowStats = {
        commits: 10,
        stars: 1,
        forks: 0,
        contributors: 1
      };

      const highStats = {
        commits: 500,
        stars: 200,
        forks: 50,
        contributors: 20
      };

      const lowLevel = deriveSkillLevel(lowStats);
      const highLevel = deriveSkillLevel(highStats);

      expect(highLevel).toBeGreaterThan(lowLevel);
    });

    it('caps the level at the maximum', () => {
      const exceptionalStats = {
        commits: 10000,
        stars: 5000,
        forks: 1000,
        contributors: 100
      };

      const level = deriveSkillLevel(exceptionalStats);

      expect(level).toBeLessThanOrEqual(10);
    });
  });
});
