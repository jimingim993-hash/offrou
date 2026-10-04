/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { injectSeoTags } from './seo-meta';
import { injectServiceWorkerBuild, precacheFiles } from './pwa-build';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/** 빌드가 끝나면 dist/sw.js에 미리 저장할 파일 목록과 버전을 넣는다 (오프라인 실행·안전한 업데이트용) */
const serviceWorkerPrecache = (): Plugin => ({
  name: 'offrou-sw-precache',
  apply: 'build',
  writeBundle(options, bundle) {
    const outDir = options.dir ?? 'dist';
    const swPath = path.join(outDir, 'sw.js');
    if (!fs.existsSync(swPath)) return;
    const files = precacheFiles(Object.keys(bundle));
    fs.writeFileSync(swPath, injectServiceWorkerBuild(fs.readFileSync(swPath, 'utf8'), files));
  },
});

/** 배포 주소·공유 이미지가 환경변수로 주어졌을 때만 canonical·og:url·og:image를 넣는다 */
const seoMeta = (env: Record<string, string>): Plugin => ({
  name: 'offrou-seo-meta',
  transformIndexHtml: (html) => injectSeoTags(html, { siteUrl: env.VITE_SITE_URL, ogImage: env.VITE_OG_IMAGE }),
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), seoMeta(env), serviceWorkerPrecache()],
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { host: true, port: 5173 },
    preview: { host: true, port: 4173 },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      // 클릭이 많은 UI 테스트가 병렬 실행 중 기본 5초를 넘길 수 있다
      testTimeout: 15000,
    },
  };
});
