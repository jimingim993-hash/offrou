/**
 * 빌드 때 서비스 워커(sw.js)에 실제 파일 목록과 버전을 넣는다.
 * 파일 이름에는 내용 해시가 들어 있으므로, 목록이 바뀌면 버전도 바뀌어 새 서비스 워커가 설치된다.
 */
const MARKER = /\/\* OFFROU_BUILD \*\/[\s\S]*?\/\* \/OFFROU_BUILD \*\//;

export function buildVersion(files: string[]): string {
  let h = 0x811c9dc5;
  for (const ch of [...files].sort().join('|')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** 미리 저장할 파일만 (소스맵·서비스 워커 자신 제외) */
export const precacheFiles = (bundleFiles: string[]) =>
  bundleFiles
    .filter((f) => !f.endsWith('.map') && f !== 'sw.js')
    .map((f) => `/${f}`)
    .sort();

export function injectServiceWorkerBuild(source: string, files: string[], version = buildVersion(files)): string {
  if (!MARKER.test(source)) throw new Error('sw.js에서 OFFROU_BUILD 표시를 찾지 못했어');
  return source.replace(MARKER, `/* OFFROU_BUILD */ ${JSON.stringify({ version, files })} /* /OFFROU_BUILD */`);
}
