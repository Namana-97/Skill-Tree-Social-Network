import { verifyGithubProof } from '@/lib/github-proof';

describe('GitHub Proof Verification', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).fetch;
  });

  describe('URL validation', () => {
    it('accepts a valid GitHub repo URL', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          stargazers_count: 100,
          forks_count: 20,
          open_issues_count: 5
        })
      }) as unknown as typeof fetch;

      const result = await verifyGithubProof('https://github.com/user/repo');

      expect(result.verified).toBe(true);
      expect(result.stats).toBeDefined();
    });

    it('rejects an invalid URL format', async () => {
      const result = await verifyGithubProof('not-a-valid-url');

      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects a non-GitHub URL', async () => {
      const result = await verifyGithubProof('https://gitlab.com/user/repo');

      expect(result.verified).toBe(false);
    });

    it('handles GitHub API errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({})
      }) as unknown as typeof fetch;

      const result = await verifyGithubProof(
        'https://github.com/nonexistent/repo'
      );

      expect(result.verified).toBe(false);
    });
  });

  describe('Evidence extraction', () => {
    it('extracts repo statistics', async () => {
      const mockStats = {
        stargazers_count: 150,
        forks_count: 30,
        open_issues_count: 10
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStats
      }) as unknown as typeof fetch;

      const result = await verifyGithubProof('https://github.com/user/repo');

      expect(result.stats?.stars).toBe(mockStats.stargazers_count);
      expect(result.stats?.forks).toBe(mockStats.forks_count);
    });
  });
});
