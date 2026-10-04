/**
 * 배포 주소·공유 이미지가 정해졌을 때만 추가하는 SEO 태그 (빌드 시 index.html에 넣는다).
 * - VITE_SITE_URL: 실제 배포 주소 (예: https://offrou.example). 없으면 canonical·og:url을 만들지 않는다.
 * - VITE_OG_IMAGE: 공유 미리보기 이미지 (절대 URL 또는 /public 기준 경로). 없으면 og:image를 만들지 않는다.
 * 가짜 주소나 임시 이미지를 최종 값처럼 넣지 않기 위해, 값이 없으면 아무것도 추가하지 않는다.
 */
const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildSeoTags(env: { siteUrl?: string; ogImage?: string }): string[] {
  const tags: string[] = [];
  const base = env.siteUrl?.trim().replace(/\/+$/, '');
  const validBase = base && /^https?:\/\/[^\s]+$/.test(base) ? base : undefined;

  if (validBase) {
    tags.push(`<link rel="canonical" href="${escapeAttr(validBase)}/" />`);
    tags.push(`<meta property="og:url" content="${escapeAttr(validBase)}/" />`);
  }

  const image = env.ogImage?.trim();
  if (image) {
    const absolute = /^https?:\/\//.test(image)
      ? image
      : validBase
        ? `${validBase}${image.startsWith('/') ? '' : '/'}${image}`
        : undefined;
    if (absolute) {
      tags.push(`<meta property="og:image" content="${escapeAttr(absolute)}" />`);
      tags.push(`<meta property="og:image:alt" content="OFFROU — 같은 하루에, 다른 시간을." />`);
    }
  }
  return tags;
}

export function injectSeoTags(html: string, env: { siteUrl?: string; ogImage?: string }): string {
  const tags = buildSeoTags(env);
  if (tags.length === 0) return html;
  let out = html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
  // 이미지가 있으면 큰 미리보기 카드로
  if (tags.some((t) => t.includes('og:image"'))) {
    out = out.replace('<meta name="twitter:card" content="summary" />', '<meta name="twitter:card" content="summary_large_image" />');
  }
  return out;
}
