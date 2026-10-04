import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Orb } from '@/components/ui/Orb';
import { TextField } from '@/components/ui/TextField';
import { messageFor, validatePassword } from '@/services/account/errors';
import { useAccount } from './AccountProvider';
import styles from './account.module.css';

/**
 * 재설정 메일의 링크로 들어오는 화면. 인증 서비스가 링크를 확인해 임시 세션을 만들면 새 비밀번호를 정한다.
 * 비밀번호는 인증 서비스에만 전달되고, OFFROU는 저장하지 않는다.
 */
export function ResetPasswordPage() {
  const { status, recovering, updatePassword } = useAccount();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (status === 'loading') {
    return (
      <div className={styles.loading}>
        <Orb />
        <p>링크를 확인하고 있어…</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.done} role="status">
        <h1 className={styles.title}>새 비밀번호로 바꿨어.</h1>
        <Link to="/app/my" className={styles.textLink}>
          MY로 돌아가기
        </Link>
      </div>
    );
  }

  if (status !== 'signedIn' && !recovering) {
    return (
      <div className={styles.done}>
        <h1 className={styles.title}>링크가 만료됐거나 올바르지 않아.</h1>
        <p className={styles.lead}>재설정 메일을 다시 받아볼까?</p>
        <Link to="/app/account?mode=reset" className={styles.textLink}>
          재설정 메일 다시 받기
        </Link>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const invalid = validatePassword(password);
    setError(invalid);
    if (invalid) return;
    setPending(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate aria-labelledby="reset-title">
      <h1 id="reset-title" className={styles.title}>
        새 비밀번호를 만들어줘.
      </h1>
      <TextField
        label="새 비밀번호"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error}
        revealable
        maxLength={72}
        placeholder="8자 이상"
      />
      <Button type="submit" block disabled={pending}>
        비밀번호 바꾸기
      </Button>
    </form>
  );
}
