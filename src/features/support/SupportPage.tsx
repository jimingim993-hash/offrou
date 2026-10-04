import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAccount } from '@/features/account/AccountProvider';
import { getContentVersion, getExperience } from '@/services/experiences';
import { SUPPORT_TYPES, statusLabel, typeLabel, type MySupportRequest, type SupportType } from '@/services/support/types';
import { useStoreVersion } from '@/hooks/useStoreVersion';
import { SupportForm } from './SupportForm';
import { getSentRequests } from './supportClient';
import styles from './support.module.css';

/** 접수 완료 화면 — 접수번호를 크게 */
export function SupportDone({ requestNumber, signedIn }: { requestNumber: string; signedIn: boolean }) {
  return (
    <section className={styles.done} role="status" aria-live="polite">
      <p className={styles.doneTitle}>접수가 완료됐어.</p>
      <p className={styles.doneLabel}>접수번호</p>
      <p className={styles.doneNumber}>{requestNumber}</p>
      <p className={styles.hint}>
        {signedIn ? 'MY → 내 문의에서 처리 상태를 볼 수 있어.' : '접수번호를 기억해두면 문의할 때 도움이 돼. 이 기기의 내 문의에도 남겨둘게.'}
      </p>
    </section>
  );
}

/**
 * /app/support — 문의 및 문제 신고. 비회원도 접수할 수 있다.
 * ?type=bug|content… &content=<경험 id> &code=<오류 코드> 로 미리 채울 수 있다.
 */
export function SupportPage() {
  const { status, supportStore } = useAccount();
  const [params] = useSearchParams();
  const [done, setDone] = useState<string | null>(null);
  const typeParam = SUPPORT_TYPES.find((t) => t.id === params.get('type'))?.id as SupportType | undefined;
  const experience = getExperience(params.get('content') ?? undefined);
  const code = params.get('code')?.slice(0, 20) ?? undefined;

  return (
    <>
      <PageHeader eyebrow="문의" title="문의 및 문제 신고" />
      {done ? (
        <>
          <SupportDone requestNumber={done} signedIn={status === 'signedIn'} />
          <div className={styles.links}>
            <Link className={styles.linkButton} to="/app/support/mine">
              내 문의 보기
            </Link>
            <Link className={styles.linkQuiet} to="/app">
              HOME으로
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className={styles.lead}>사용하다 불편한 점이나 궁금한 점을 알려줘. 로그인하지 않아도 보낼 수 있어.</p>
          <SupportForm
            store={supportStore}
            initialType={typeParam ?? (experience ? 'content' : 'bug')}
            extraInfo={{
              ...(experience && { content_id: experience.id, content_version: getContentVersion(experience), category: experience.categoryId }),
              ...(code && { error_code: code }),
            }}
            onDone={setDone}
          />
          <p className={styles.links}>
            <Link className={styles.linkQuiet} to="/app/support/mine">
              내 문의 보기
            </Link>
          </p>
        </>
      )}
    </>
  );
}

/** /app/support/mine — 로그인 사용자는 서버의 내 문의(상태·답변), 비회원은 이 기기에서 보낸 접수번호 */
export function MySupportPage() {
  useStoreVersion();
  const { status, user } = useAccount();
  const { supportStore } = useAccount();
  const [items, setItems] = useState<MySupportRequest[] | null>(null);
  const [error, setError] = useState(false);
  const signedIn = status === 'signedIn';

  useEffect(() => {
    if (!signedIn || !supportStore) return;
    let alive = true;
    supportStore
      .listMine()
      .then((list) => alive && setItems(list))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [signedIn, supportStore, user?.id]);

  const sent = getSentRequests();

  return (
    <>
      <PageHeader eyebrow="문의" title="내 문의" />
      <p className={styles.links}>
        <Link className={styles.linkButton} to="/app/support">
          문의 및 문제 신고
        </Link>
      </p>
      {signedIn ? (
        error ? (
          <p className={styles.hint} role="status">
            지금은 문의 목록을 불러오지 못했어. 연결되면 다시 볼 수 있어.
          </p>
        ) : items === null ? (
          <p className={styles.hint}>불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className={styles.empty}>아직 보낸 문의가 없어.</p>
        ) : (
          <ul className={styles.mine} aria-label="내 문의 목록">
            {items.map((r) => (
              <li key={r.requestNumber} className={styles.mineItem}>
                <p className={styles.mineTop}>
                  <span className={styles.badge}>{statusLabel(r.status)}</span>
                  <span className={styles.number}>{r.requestNumber}</span>
                </p>
                <p className={styles.mineTitle}>{r.title}</p>
                <p className={styles.hint}>{`${typeLabel(r.type)} · ${r.createdAt.slice(0, 10)}`}</p>
                {r.reply && (
                  <div className={styles.reply}>
                    <p className={styles.replyLabel}>운영자 답변</p>
                    <p>{r.reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          <p className={styles.hint}>로그인하면 처리 상태와 답변을 여기서 볼 수 있어. 비회원 문의는 접수번호로 확인할 수 있어.</p>
          {sent.length === 0 ? (
            <p className={styles.empty}>이 기기에서 보낸 문의가 없어.</p>
          ) : (
            <ul className={styles.mine} aria-label="이 기기에서 보낸 문의">
              {sent.map((r) => (
                <li key={r.requestNumber} className={styles.mineItem}>
                  <p className={styles.number}>{r.requestNumber}</p>
                  <p className={styles.mineTitle}>{r.title}</p>
                  <p className={styles.hint}>{r.createdAt.slice(0, 10)}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
