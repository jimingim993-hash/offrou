import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { createAppRouter } from '@/app/router';
import { registerServiceWorker } from '@/pwa/registerServiceWorker';
import { captureInstallPrompt } from '@/pwa/install';
import '@/styles/global.css';

// 설치 이벤트는 첫 화면보다 먼저 올 수 있어 바로 잡아둔다 (MY에서 사용자가 누를 때만 쓴다)
captureInstallPrompt();

const router = createAppRouter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

registerServiceWorker();
