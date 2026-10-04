import { Link } from 'react-router-dom';
import { getLink } from '@/services/account/link';
import { useAccount, type AccountNotice } from './AccountProvider';
import { SyncStatus } from './SyncStatus';
import styles from './account.module.css';

const NOTICES: Record<Exclude<AccountNotice, null>, string> = {
  continued: '지금까지의 시간을 이어왔어.',
  fresh: '계정에서 새로 시작했어. 이 기기의 이전 기록은 따로 보관해뒀어.',
  signed_out: '로그아웃했어. OFFROU는 그대로 쓸 수 있어.',
  deleted: '계정을 삭제했어. 이 기기에 남은 기록은 그대로 있어.',
  password_updated: '비밀번호를 바꿨어.',
};

/** MY 상단의 작은 계정 영역. 로그인을 강요하지 않는다. */
export function AccountCard() {
  const { status, pendingLink, notice, clearNotice } = useAccount();

  return (
    <section className={styles.card} aria-label="계정">
      {notice && (
        <p className={styles.notice} role="status">
          {NOTICES[notice]}
          <button type="button" className={styles.noticeClose} aria-label="알림 닫기" onClick={clearNotice}>
            ✕
          </button>
        </p>
      )}

      {status === 'signedIn' && pendingLink ? (
        <>
          <p className={styles.cardTitle}>이 기기의 기록을 계정에 이어갈지 골라줘.</p>
          <Link to="/app/account" className={styles.cardAction}>
            고르러 가기
          </Link>
        </>
      ) : status === 'signedIn' ? (
        <>
          <p className={styles.cardTitle}>OFFROU가 이어지고 있어.</p>
          <SyncStatus />
          <Link to="/app/account" className={styles.cardLink}>
            계정 설정
          </Link>
        </>
      ) : status === 'loading' ? (
        <p className={styles.cardText}>계정을 확인하고 있어…</p>
      ) : (
        <>
          <p className={styles.cardTitle}>이 기기에만 기록되고 있어.</p>
          {status === 'unavailable' ? (
            import.meta.env.DEV && <p className={styles.cardText}>계정 연결 준비가 필요해. (.env.example 참고)</p>
          ) : (
            <>
              <p className={styles.cardText}>
                {getLink() ? '다시 로그인하면 계정과 이어져.' : '계정을 만들면 다른 기기에서도 이어볼 수 있어.'}
              </p>
              <div className={styles.cardButtons}>
                <Link to="/app/account?mode=signup" className={styles.cardAction}>
                  계정 만들기
                </Link>
                <Link to="/app/account?mode=login" className={styles.cardSecondary}>
                  로그인
                </Link>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
