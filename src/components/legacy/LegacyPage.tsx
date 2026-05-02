import Script from 'next/script';

import { loadLegacyPage } from '@/lib/legacy-pages';

type Props = {
  fileName: string;
  scriptId: string;
  scriptSrc: string;
};

export function LegacyPage({ fileName, scriptId, scriptSrc }: Props) {
  const page = loadLegacyPage(fileName);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: page.style }} />
      <div dangerouslySetInnerHTML={{ __html: page.body }} />
      <Script id="legacy-api" src="/legacy/api.js" strategy="beforeInteractive" />
      <Script id="legacy-auth-modal" src="/legacy/auth-modal.js" strategy="beforeInteractive" />
      <Script id={scriptId} src={scriptSrc} strategy="afterInteractive" />
    </>
  );
}
