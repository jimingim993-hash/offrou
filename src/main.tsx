import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { createAppRouter } from '@/app/router';
import { registerServiceWorker } from '@/pwa/registerServiceWorker';
import { captureInstallPrompt } from '@/pwa/install';
import { runStorageMigrations } from '@/services/storageMigrations';
import '@/styles/global.css';

// 저장 구조 버전 확인·마이그레이션 (기존 데이터를 지우지 않는다. 실패하면 원본 그대로 두고 계속)
const migration = runStorageMigrations();
if (!migration.ok && import.meta.env.DEV) console.warn('[OFFROU storage] 마이그레이션을 건너뛰었어', migration.error);

// 설치 이벤트는 첫 화면보다 먼저 올 수 있어 바로 잡아둔다 (MY에서 사용자가 누를 때만 쓴다)
captureInstallPrompt();

const router = createAppRouter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

registerServiceWorker();
