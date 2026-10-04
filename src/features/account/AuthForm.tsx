import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { messageFor, validateEmail, validatePassword } from '@/services/account/errors';
import { useAccount } from './AccountProvider';
import styles from './account.module.css';

export type AuthMode = 'signup' | 'login' | 'reset';

const COPY: Record<AuthMode, { title: string; lead: string; submit: string }> = {
  signup: {
    title: '다른 기기에서도 이 시간을 이어갈까?',
    lead: '이메일과 비밀번호만 있으면 돼. 다른 정보는 묻지 않아.',
    submit: 'OFFROU 시작하기',
  },
  login: { title: '다시 만나서 반가워.', lead: '로그인하면 다른 기기의 기록과 이어져.', submit: '로그인' },
  reset: {
    title: '비밀번호를 다시 만들어볼까?',
    lead: '가입한 이메일로 새 비밀번호를 만드는 링크를 보내줄게.',
    submit: '재설정 메일 보내기',
  },
};

/** 회원가입·로그인·재설정 메일 요청. 인증 처리는 AccountProvider(→ 백엔드)가 맡는다. */
export function AuthForm({ mode, onSignedIn }: { mode: AuthMode; onSignedIn: () => void }) {
  const account = useAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null; form?: string }>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<'confirm' | 'reset' | null>(null);
  const copy = COPY[mode];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = {
      email: validateEmail(email),
      password: mode === 'reset' ? null : mode === 'signup' ? validatePassword(password) : password ? null : '비밀번호를 입력해줘.',
    };
    setErrors(next);
    if (next.email || next.password) return;

    setPending(true);
    try {
      if (mode === 'reset') {
        await account.requestPasswordReset(email);
        setSent('reset');
      } else if (mode === 'signup') {
        const result = await account.signUp(email, password);
        if (result.needsEmailConfirm) setSent('confirm');
        else onSignedIn();
      } else {
        await account.signIn(email, password);
        onSignedIn();
      }
    } catch (error) {
      setErrors({ form: messageFor(error) });
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.done} role="status">
        <p className={styles.doneSymbol} aria-hidden="true">
          ✉️
        </p>
        <h1 className={styles.title}>메일함을 확인해줘.</h1>
        <p className={styles.lead}>
          {sent === 'confirm'
            ? '인증 링크를 누르면 OFFROU가 계정과 이어져.'
            : '그 이메일로 가입했다면, 새 비밀번호를 만드는 링크가 도착할 거야.'}
        </p>
        <Link to="/app/my" className={styles.textLink}>
          MY로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate aria-labelledby="auth-title">
      <h1 id="auth-title" className={styles.title}>
        {copy.title}
      </h1>
      <p className={styles.lead}>{copy.lead}</p>

      <TextField
        label="이메일"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        maxLength={254}
      />
      {mode !== 'reset' && (
        <TextField
          label="비밀번호"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          revealable
          maxLength={72}
          placeholder={mode === 'signup' ? '8자 이상' : undefined}
        />
      )}

      {errors.form && (
        <p className={styles.formError} role="alert">
          {errors.form}
        </p>
      )}

      <Button type="submit" block disabled={pending}>
        {pending ? '잠깐만…' : copy.submit}
      </Button>

      <div className={styles.switches}>
        {mode === 'signup' && (
          <p>
            이미 계정이 있어?{' '}
            <Link to="/app/account?mode=login" replace className={styles.textLink}>
              로그인
            </Link>
          </p>
        )}
        {mode === 'login' && (
          <>
            <p>
              처음이야?{' '}
              <Link to="/app/account?mode=signup" replace className={styles.textLink}>
                계정 만들기
              </Link>
            </p>
            <Link to="/app/account?mode=reset" replace className={styles.textLink}>
              비밀번호를 잊었어?
            </Link>
          </>
        )}
        {mode === 'reset' && (
          <Link to="/app/account?mode=login" replace className={styles.textLink}>
            로그인으로 돌아가기
          </Link>
        )}
        <Link to="/app/my" className={styles.quietLink}>
          지금은 괜찮아
        </Link>
      </div>
    </form>
  );
}
