import {
  envSchema,
  loginSchema,
  skillSchema,
  validateRequest
} from '@/lib/validation';

describe('Validation helpers', () => {
  it('validates login payloads with username', () => {
    const result = validateRequest(loginSchema, {
      username: 'tester',
      password: 'password123'
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid login payloads', () => {
    const result = validateRequest(loginSchema, {
      password: ''
    });

    expect(result.success).toBe(false);
  });

  it('normalizes skill payload aliases', () => {
    const result = validateRequest(skillSchema, {
      skill_name: 'React',
      level: 4,
      proof_url: 'https://github.com/example/repo',
      color: '#123ABC'
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Skill schema should have validated.');
    }
    expect(result.data.name).toBe('React');
  });

  it('rejects invalid skill colors', () => {
    const result = validateRequest(skillSchema, {
      name: 'React',
      level: 3,
      color: 'red'
    });

    expect(result.success).toBe(false);
  });

  it('accepts empty optional environment variables', () => {
    const result = envSchema.parse({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/skillforge',
      JWT_SECRET: '12345678901234567890123456789012',
      GITHUB_TOKEN: '',
      SENDGRID_API_KEY: '',
      SENDGRID_FROM_EMAIL: '',
      ALGOLIA_APP_ID: '',
      ALGOLIA_ADMIN_API_KEY: '',
      ALGOLIA_INDEX_NAME: '',
      NODE_ENV: 'test'
    });

    expect(result.SENDGRID_FROM_EMAIL).toBeUndefined();
    expect(result.GITHUB_TOKEN).toBeUndefined();
  });
});
