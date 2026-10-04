import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { messageFor } from '@/services/account/errors';
import { readLocalSnapshot, summarizeSnapshot } from '@/services/sync/snapshot';
import { useAccount } from './AccountProvider';
import styles from './account.module.css';

/** 로그인 후, 이 기기에 비회원 기록이 있을 때 한 번 묻는다 */
export function LinkPrompt({ onDone }: { onDone: () => void }) {
  const { resolveLink } = useAccount();
  const [{ records, saved }] = useState(() => summarizeSnapshot(readLocalSnapshot()));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (choice: 'continue' | 'fresh') => {
    setPending(true);
    setError(null);
    try {
      await resolveLink(choice);
      onDone();
    } catch (e) {
      // 동기화가 실패해도 선택은 반영됐고 기록은 이 기기에 남아 있다
      setError(messageFor(e));
      onDone();
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={styles.form} aria-labelledby="link-title">
      <h1 id="link-title" className={styles.title}>
        이 기기의 OFFROU 기록을 계정에 이어갈까?
      </h1>
      <p className={styles.lead}>
        이 기기에 지나온 시간 <strong>{records}개</strong>, 저장한 시간 <strong>{saved}개</strong>가 있어.
      </p>
      <Button block disabled={pending} onClick={() => void choose('continue')}>
        이어가기
      </Button>
      <Button block variant="ghost" disabled={pending} onClick={() => void choose('fresh')}>
        새로 시작하기
      </Button>
      <p className={styles.hint}>새로 시작해도 이 기기의 기록은 지우지 않고 따로 보관해둘게. 계정에는 올리지 않아.</p>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
