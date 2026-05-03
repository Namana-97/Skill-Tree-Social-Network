import { recomputeMatches, computeComplementScore } from '@/lib/matches';
import { publishEvent } from '@/lib/realtime';
import { prismaMock } from '@/tests/prisma-mock';

describe('Complement Matching', () => {
  describe('computeComplementScore', () => {
    it('calculates the non-overlapping skill percentage', () => {
      const userA = ['React', 'Node', 'SQL'];
      const userB = ['Python', 'Docker', 'SQL'];

      const score = computeComplementScore(userA, userB);

      expect(score).toBe(80);
    });

    it('returns 0 for identical skill sets', () => {
      const skills = ['React', 'Node', 'TypeScript'];
      const score = computeComplementScore(skills, skills);

      expect(score).toBe(0);
    });

    it('returns 100 for completely different skill sets', () => {
      const userA = ['React', 'Node'];
      const userB = ['Python', 'Go'];

      const score = computeComplementScore(userA, userB);

      expect(score).toBe(100);
    });

    it('handles empty skill sets', () => {
      const score = computeComplementScore([], []);

      expect(score).toBe(0);
    });

    it('is case-insensitive', () => {
      const userA = ['react', 'node'];
      const userB = ['React', 'Python'];

      const score = computeComplementScore(userA, userB);

      expect(score).toBe(67);
    });
  });

  describe('recomputeMatches', () => {
    it('recomputes cached match scores and publishes an event', async () => {
      (prismaMock.skill.findMany as jest.Mock)
        .mockResolvedValueOnce([{ name: 'React' }, { name: 'Node' }])
        .mockResolvedValueOnce([
          { userId: 2, name: 'Python' },
          { userId: 2, name: 'Node' },
          { userId: 3, name: 'Go' }
        ]);
      (prismaMock.user.findMany as jest.Mock).mockResolvedValue([
        { id: 2 },
        { id: 3 }
      ]);
      (prismaMock.match.deleteMany as jest.Mock).mockResolvedValue({
        count: 2
      });
      (prismaMock.match.upsert as jest.Mock).mockResolvedValue({});

      await recomputeMatches(1);

      expect(prismaMock.match.deleteMany).toHaveBeenCalled();
      expect(prismaMock.match.upsert).toHaveBeenCalledTimes(4);
      expect((publishEvent as jest.Mock).mock.calls[0][0]).toEqual({
        type: 'matches.recomputed',
        data: { userId: 1 }
      });
    });
  });
});
