import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet, SheetQuietButton } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { messageFor, validatePassword } from '@/services/account/errors';
import { useAccount } from './AccountProvider';
import { SyncStatus } from './SyncStatus';
import styles from './account.module.css';

/** 최소한의 계정 설정: 이메일 확인 · 동기화 · 비밀번호 변경 · 로그아웃 · 계정 삭제 */
export function AccountSettings({ onLeave }: { onLeave: () => void }) {
  const account = useAccount();
  const [sheet, setSheet] = useState<'signout' | 'delete' | null>(null);

  return (
    <div className={styles.settings}>
      <header className={styles.settingsHead}>
        <p className={styles.eyebrow}>MY ACCOUNT</p>
        <h1 className={styles.title}>OFFROU가 이어지고 있어.</h1>
        <p className={styles.email}>{account.user?.email}</p>
        <SyncStatus />
        <button type="button" className={styles.textButton} onClick={() => void account.syncNow()}>
          지금 동기화
        </button>
      </header>

      <PasswordChange />

      <div className={styles.settingsActions}>
        <Button block variant="ghost" onClick={() => setSheet('signout')}>
          로그아웃
        </Button>
        <button type="button" className={styles.dangerLink} onClick={() => setSheet('delete')}>
          OFFROU 계정 삭제
        </button>
      </div>

      {sheet === 'signout' && <SignOutSheet onClose={() => setSheet(null)} onDone={onLeave} />}
      {sheet === 'delete' && <DeleteSheet onClose={() => setSheet(null)} onDone={onLeave} />}
    </div>
  );
}

function PasswordChange() {
  const { updatePassword } = useAccount();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const invalid = validatePassword(password);
    setError(invalid);
    if (invalid) return;
    setPending(true);
    try {
      await updatePassword(password);
      setPassword('');
      setDone(true);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form className={styles.section} onSubmit={submit} noValidate aria-labelledby="pw-title">
      <h2 id="pw-title" className={styles.sectionTitle}>
        비밀번호 바꾸기
      </h2>
      <TextField
        label="새 비밀번호"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setDone(false);
        }}
        error={error}
        revealable
        maxLength={72}
        placeholder="8자 이상"
      />
      <Button type="submit" variant="ghost" block disabled={pending}>
        비밀번호 바꾸기
      </Button>
      {done && (
        <p className={styles.success} role="status">
          비밀번호를 바꿨어.
        </p>
      )}
    </form>
  );
}

function SignOutSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { signOut } = useAccount();
  const [clearLocal, setClearLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      await signOut({ clearLocal });
      onDone();
    } catch (e) {
      setError(
        clearLocal
          ? '아직 계정에 올라가지 않은 기록이 있어. 연결된 뒤에 지우거나, 기록은 남기고 로그아웃해줘.'
          : messageFor(e),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet title="로그아웃할까?" description="로그아웃해도 OFFROU는 그대로 쓸 수 있어." onClose={onClose}>
      <label className={styles.check}>
        <input type="checkbox" checked={clearLocal} onChange={(e) => setClearLocal(e.target.checked)} />
        <span>이 기기에 남은 기록도 지우기 (계정에 저장된 기록은 그대로)</span>
      </label>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      <SheetQuietButton onClick={onClose}>그만둘래</SheetQuietButton>
      <Button block variant="ghost" disabled={pending} onClick={() => void confirm()}>
        로그아웃
      </Button>
    </Sheet>
  );
}

function DeleteSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { deleteAccount } = useAccount();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      await deleteAccount();
      onDone();
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet
      title="OFFROU 계정을 삭제할까?"
      description="계정과, 서버에 저장된 지나온 시간·저장한 시간·피드백·취향 기록이 모두 지워져. 되돌릴 수 없어. 이 기기에 남은 기록은 그대로 남고, MY의 '내 OFFROU 기록 초기화'로 따로 지울 수 있어."
      onClose={onClose}
    >
      <label className={styles.check}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>위 내용을 확인했어</span>
      </label>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      <SheetQuietButton onClick={onClose}>그만둘래</SheetQuietButton>
      <button type="button" className={styles.dangerButton} disabled={!agreed || pending} onClick={() => void confirm()}>
        계정 삭제
      </button>
    </Sheet>
  );
}
