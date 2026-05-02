import { NextRequest } from 'next/server';

import { assertAdmin } from '@/lib/admin';
import { getAnalyticsSummary } from '@/lib/analytics';
import { requireAuth } from '@/lib/auth';
import { fail, ok } from '@/lib/http';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    await assertAdmin(auth.id);
    const summary = await getAnalyticsSummary();
    return ok(summary);
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required.') {
      return fail(403, error.message);
    }
    console.error(error);
    return fail(500, 'Could not load analytics summary.');
  }
}
