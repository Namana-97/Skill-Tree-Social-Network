
import { z } from 'zod';
import { insertLeadSchema, insertCaseSchema, leads, cases, conversations, messages, articles } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  agent: {
    message: {
      method: 'POST' as const,
      path: '/api/agent/message',
      input: z.object({
        conversationId: z.number().optional(),
        user: z.string().optional(),
        text: z.string(),
        channel: z.enum(['web', 'slack']).default('web'),
      }),
      responses: {
        200: z.object({
          reply: z.string(),
          conversationId: z.number(),
          actions: z.array(z.object({
            type: z.string(),
            payload: z.any(),
            reasoning: z.string()
          })),
        }),
      },
    },
    simulateSprint: {
      method: 'POST' as const,
      path: '/api/agent/simulate-sprint-preview',
      responses: {
        200: z.object({
          blockersPerMonth: z.number(),
          resolutionRate: z.number(),
          avgFrequency: z.number(),
          resolutionTime: z.number(),
        }),
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/agent/history/:conversationId',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    }
  },
  salesforce: {
    leads: {
      list: {
        method: 'GET' as const,
        path: '/api/salesforce/leads',
        responses: {
          200: z.array(z.custom<typeof leads.$inferSelect>()),
        },
      },
    },
    cases: {
      list: {
        method: 'GET' as const,
        path: '/api/salesforce/cases',
        responses: {
          200: z.array(z.custom<typeof cases.$inferSelect>()),
        },
      },
    }
  },
  admin: {
    config: {
      method: 'POST' as const,
      path: '/api/admin/config',
      input: z.object({
        mode: z.enum(['mock', 'real']),
        sfUsername: z.string().optional(),
      }),
      responses: {
        200: z.object({ status: z.string() }),
      },
    },
    status: {
        method: 'GET' as const,
        path: '/api/admin/status',
        responses: {
            200: z.object({ mode: z.enum(['mock', 'real']) })
        }
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
