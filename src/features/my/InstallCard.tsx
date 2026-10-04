import { useState } from 'react';
import { promptInstall, useInstallState } from '@/pwa/install';
import styles from './AppSettings.module.css';

/**
 * 홈 화면에 추가 안내. MY 안에서만 보여주고, 팝업으로 권하지 않는다.
 * 설치할 수 없는 환경에서는 아무것도 보여주지 않는다 (가짜 설치 버튼 없음).
 */
export function InstallCard() {
  const state = useInstallState();
  const [busy, setBusy] = useState(false);

  if (state === 'unsupported') return null;

  return (
    <div className={styles.item} aria-label="홈 화면에 추가" role="group">
      <p className={styles.itemTitle}>홈 화면에 추가</p>
      {state === 'installed' ? (
        <p className={styles.itemText} role="status">
          <span aria-hidden="true">✓ </span>OFFROU 앱으로 사용 중
        </p>
      ) : state === 'available' ? (
        <>
          <p className={styles.itemText}>홈 화면에서 OFFROU를 바로 열 수 있어.</p>
          <button
            type="button"
            className={styles.action}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await promptInstall();
              setBusy(false);
            }}
          >
            홈 화면에 추가하기
          </button>
        </>
      ) : state === 'ios-safari' ? (
        <>
          <p className={styles.itemText}>Safari의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택해줘.</p>
          <ol className={styles.steps}>
            <li>
              화면 아래(또는 위)의 공유 버튼 <span aria-hidden="true">⬆︎</span>을 눌러
            </li>
            <li>‘홈 화면에 추가’를 고른 뒤</li>
            <li>오른쪽 위 ‘추가’를 누르면 끝</li>
          </ol>
        </>
      ) : (
        <p className={styles.itemText}>iPhone·iPad에서는 Safari로 열면 홈 화면에 추가할 수 있어.</p>
      )}
    </div>
  );
}
