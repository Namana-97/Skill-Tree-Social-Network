import { NextRequest } from 'next/server';
import { z } from 'zod';

import { optionalAuth } from '@/lib/auth';
import { trackEvent } from '@/lib/analytics';
import { fail, ok } from '@/lib/http';

const schema = z.object({
  eventName: z.string().min(1).max(120),
  path: z.string().max(255).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable()
});

export async function POST(request: NextRequest) {
  try {
    const auth = optionalAuth(request);
    const body = schema.parse(await request.json());

    const event = await trackEvent({
      userId: auth?.id,
      eventName: body.eventName,
      path: body.path,
      metadata: body.metadata
    });

    return ok(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(400, error.issues[0]?.message || 'Invalid request.');
    }

    console.error(error);
    return fail(500, 'Could not track analytics event.');
  }
}
