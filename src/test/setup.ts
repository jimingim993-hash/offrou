import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// node 환경 테스트(서비스 워커·빌드 스크립트 등)에서는 브라우저 저장소가 없다
const hasDom = typeof window !== 'undefined';

afterEach(() => {
  if (!hasDom) return;
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
if (hasDom) window.scrollTo = () => {};
