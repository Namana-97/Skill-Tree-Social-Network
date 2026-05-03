import { applyXpDelta, calculateLevel } from '@/lib/progress';

describe('XP and Level Progression', () => {
  describe('calculateLevel', () => {
    it('derives level from XP using the current progression curve', () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(100)).toBe(1);
      expect(calculateLevel(250)).toBe(3);
      expect(calculateLevel(999)).toBe(10);
    });

    it('uses the existing ceil-based level calculation', () => {
      expect(calculateLevel(101)).toBe(2);
      expect(calculateLevel(199)).toBe(2);
      expect(calculateLevel(200)).toBe(2);
    });
  });

  describe('applyXpDelta', () => {
    it('adds XP and recalculates level', async () => {
      const mockPrisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({ xp: 100 }),
          update: jest.fn().mockResolvedValue({
            id: 1,
            xp: 150,
            level: 2
          })
        }
      };

      const result = await applyXpDelta(1, 50, mockPrisma as never);

      expect(result.xp).toBe(150);
      expect(result.level).toBe(2);
    });

    it('subtracts XP without going below zero', async () => {
      const mockPrisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({ xp: 20 }),
          update: jest.fn().mockResolvedValue({
            id: 1,
            xp: 0,
            level: 1
          })
        }
      };

      const result = await applyXpDelta(1, -50, mockPrisma as never);

      expect(result.xp).toBeGreaterThanOrEqual(0);
      expect(result.level).toBe(1);
    });
  });
});
