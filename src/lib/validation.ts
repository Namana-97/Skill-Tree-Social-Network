import { z } from 'zod';

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value === 'string' && value.trim() === '') {
      return undefined;
    }
    return value;
  }, schema.optional());

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(40, 'Username must be at most 40 characters')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Username can only contain letters, numbers, and underscores'
  );

const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Display name is required')
  .max(80, 'Display name must be at most 80 characters');

const roleTitleSchema = z
  .string()
  .trim()
  .max(120, 'Role title must be at most 120 characters');

const skillNameSchema = z
  .string()
  .trim()
  .min(1, 'Skill name is required')
  .max(80, 'Skill name must be at most 80 characters');

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be at most 100 characters'),
    display_name: displayNameSchema.optional(),
    role_title: roleTitleSchema.optional()
  })
  .transform((value) => ({
    ...value,
    display_name: value.display_name || value.username,
    role_title: value.role_title || ''
  }));

export const loginSchema = z
  .object({
    email: z.string().email('Invalid email address').optional(),
    username: z.string().trim().min(1, 'Username is required').optional(),
    password: z.string().min(1, 'Password is required')
  })
  .refine((value) => Boolean(value.email || value.username), {
    message: 'Email or username is required',
    path: ['email']
  });

export const skillEvidenceSchema = z.object({
  type: z.enum([
    'profile',
    'repo',
    'commit',
    'project',
    'pull_request',
    'demo',
    'case_study',
    'certification',
    'article',
    'work_sample'
  ]),
  title: z.string().trim().max(120).optional().nullable(),
  url: z.string().url('Proof URL must be a valid URL'),
  issuer: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  impact: z.string().trim().max(255).optional().nullable(),
  is_verified: z.boolean().optional()
});

export const skillSchema = z
  .object({
    name: skillNameSchema.optional(),
    skill_name: skillNameSchema.optional(),
    level: z.number().int('Level must be an integer').min(1).max(5),
    proof_url: z
      .string()
      .url('Proof URL must be a valid URL')
      .optional()
      .nullable(),
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color')
      .optional(),
    evidence: z.array(skillEvidenceSchema).max(6).optional()
  })
  .refine((value) => Boolean(value.name || value.skill_name), {
    message: 'Skill name is required',
    path: ['name']
  })
  .transform((value) => ({
    name: value.name || value.skill_name || '',
    level: value.level,
    proof_url: value.proof_url ?? null,
    color: value.color,
    evidence: value.evidence
  }));

export const vouchSchema = z.object({
  recipient_id: z.number().int().positive('Invalid recipient ID').optional(),
  skill_id: z.number().int().positive('Invalid skill ID'),
  message: z
    .string()
    .trim()
    .max(500, 'Message must be at most 500 characters')
    .optional()
});

export const edgeSchema = z.object({
  source_skill_id: z.number().int().positive('Invalid source skill ID'),
  target_skill_id: z.number().int().positive('Invalid target skill ID')
});

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (result.success) {
    return {
      success: true as const,
      data: result.data
    };
  }

  return {
    success: false as const,
    errors: result.error
  };
}

export const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (value) =>
        value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL must be a PostgreSQL connection string'
    ),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  GITHUB_TOKEN: emptyStringToUndefined(z.string()),
  SENDGRID_API_KEY: emptyStringToUndefined(z.string()),
  SENDGRID_FROM_EMAIL: emptyStringToUndefined(z.string().email()),
  ALGOLIA_APP_ID: emptyStringToUndefined(z.string()),
  ALGOLIA_ADMIN_API_KEY: emptyStringToUndefined(z.string()),
  ALGOLIA_INDEX_NAME: emptyStringToUndefined(z.string()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

if (process.env.NODE_ENV === 'production') {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten());
    throw new Error('Invalid environment configuration.');
  }
}
