import fs from 'node:fs';
import path from 'node:path';

type LegacyPage = {
  style: string;
  body: string;
  inlineScript: string;
};

const cache = new Map<string, LegacyPage>();

export function loadLegacyPage(fileName: string): LegacyPage {
  if (cache.has(fileName)) {
    return cache.get(fileName)!;
  }

  const fullPath = path.join(process.cwd(), 'frontend', fileName);
  const html = fs.readFileSync(fullPath, 'utf8');
  const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
  const bodyContent = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] || '';
  const scripts = [...bodyContent.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1]?.trim())
    .filter(Boolean) as string[];
  const inlineScript = transformRoutes(scripts.at(-1) || '');
  const body = transformRoutes(bodyContent.replace(/<script[\s\S]*?<\/script>/g, '').trim());

  const result = { style, body, inlineScript };
  cache.set(fileName, result);
  return result;
}

function transformRoutes(value: string) {
  return value
    .replaceAll('LandingPage.html', '/')
    .replaceAll('Discover.html', '/discover')
    .replaceAll('profile.html', '/profile');
}
