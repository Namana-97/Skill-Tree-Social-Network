import { loadLegacyPage } from '@/lib/legacy-pages';

const PAGE_MAP: Record<string, string> = {
  landing: 'LandingPage.html',
  discover: 'Discover.html',
  profile: 'profile.html'
};

type Context = {
  params: Promise<{ page: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { page } = await context.params;
  const fileName = PAGE_MAP[page];

  if (!fileName) {
    return new Response('Not found', { status: 404 });
  }

  const legacyPage = loadLegacyPage(fileName);

  return new Response(legacyPage.inlineScript, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}
