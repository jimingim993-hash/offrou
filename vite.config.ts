/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { injectSeoTags } from './seo-meta';

/** 배포 주소·공유 이미지가 환경변수로 주어졌을 때만 canonical·og:url·og:image를 넣는다 */
const seoMeta = (env: Record<string, string>): Plugin => ({
  name: 'offrou-seo-meta',
  transformIndexHtml: (html) => injectSeoTags(html, { siteUrl: env.VITE_SITE_URL, ogImage: env.VITE_OG_IMAGE }),
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), seoMeta(env)],
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
