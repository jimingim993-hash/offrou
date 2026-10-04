import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { APP_VERSION } from './version';
import { errorCode, errorName, noteAppError } from '@/services/errorLog';
import styles from './AppError.module.css';

/**
 * 예상하지 못한 화면 오류가 나도 하얀 화면 대신 보이는 안내 (라우터 errorElement).
 * 사용자 데이터는 건드리지 않는다. 오류 코드·버전·경로만 이 기기에 남겨 문의 때 함께 보낼 수 있게 한다.
 */
export function AppError() {
  const error = useRouteError();
  const route = window.location.pathname;
  const code = errorCode(errorName(error), route);
  useEffect(() => {
    noteAppError(error, route);
  }, [error, route]);
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className={styles.wrap}>
      <div className={styles.card} role="alert">
        <p className={styles.brand}>OFFROU</p>
        <h1 className={styles.title}>{notFound ? '찾는 화면이 없어.' : '잠깐 문제가 생겼어.'}</h1>
        <p className={styles.text}>기록과 저장한 시간은 그대로 있어. HOME에서 다시 시작해줘.</p>
        <div className={styles.actions}>
          {/* 오류가 난 화면 상태를 벗어나도록 새로 불러온다 */}
          <a className={styles.primary} href="/app">
            HOME으로
          </a>
          <a className={styles.secondary} href={`/app/support?type=bug&code=${encodeURIComponent(code)}`}>
            문제 알려주기
          </a>
        </div>
        <p className={styles.code}>
          오류 코드 {code} · v{APP_VERSION}
        </p>
      </div>
    </main>
  );
}
