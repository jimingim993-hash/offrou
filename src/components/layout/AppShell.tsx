import { Outlet, useLocation, useMatches } from 'react-router-dom';
import { useEffect } from 'react';
import { BottomNav } from './BottomNav';
import { AccountProvider } from '@/features/account/AccountProvider';
import styles from './AppShell.module.css';

/** 라우트 handle로 몰입형 화면(하단 내비 숨김)을 지정한다 */
export interface RouteHandle {
  immersive?: boolean;
}

export function AppShell() {
  const { pathname } = useLocation();
  const immersive = useMatches().some((m) => (m.handle as RouteHandle | undefined)?.immersive);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  // 서비스 화면 제목 (공식 홈페이지는 따로 정한다)
  useEffect(() => {
    document.title = 'OFFROU 오프루';
  }, []);

  return (
    <AccountProvider>
      <div className={styles.shell}>
        <main className={`${styles.main} ${immersive ? styles.immersive : ''}`}>
          {/* key로 화면 전환 시 가벼운 등장 애니메이션 */}
          <div key={pathname} className={`${styles.page} rise`}>
            <Outlet />
          </div>
        </main>
        {!immersive && <BottomNav />}
      </div>
    </AccountProvider>
  );
}
