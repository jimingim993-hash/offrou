import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Orb } from '@/components/ui/Orb';
import { useAccount } from './AccountProvider';
import { AuthForm, type AuthMode } from './AuthForm';
import { LinkPrompt } from './LinkPrompt';
import { AccountSettings } from './AccountSettings';
import styles from './account.module.css';

const MODES: AuthMode[] = ['signup', 'login', 'reset'];

/**
 * 계정 화면 하나로 상태에 맞게 보여준다.
 * 비회원: 회원가입/로그인/재설정 · 로그인 직후 비회원 기록이 있으면: 이어갈까? · 로그인: 계정 설정
 * 끝나면 MY(원래 화면)로 돌아간다. 별도 대시보드는 없다.
 */
export function AccountPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { status, pendingLink } = useAccount();
  const mode = MODES.find((m) => m === params.get('mode')) ?? 'signup';
  const [justSignedIn, setJustSignedIn] = useState(false);
  const back = () => navigate('/app/my', { replace: true });

  // 로그인 직후 이어갈 기록이 없으면 바로 원래 화면으로
  useEffect(() => {
    if (justSignedIn && status === 'signedIn' && !pendingLink) navigate('/app/my', { replace: true });
  }, [justSignedIn, status, pendingLink, navigate]);

  if (status === 'unavailable') {
    return (
      <EmptyState
        symbol="🔌"
        title="계정 연결 준비가 필요해."
        description="지금은 이 기기에만 기록되고 있어. OFFROU는 그대로 쓸 수 있어."
      >
        <Button variant="ghost" onClick={back}>
          MY로 돌아가기
        </Button>
      </EmptyState>
    );
  }

  if (status === 'loading') {
    return (
      <div className={styles.loading}>
        <Orb />
        <p>계정을 확인하고 있어…</p>
      </div>
    );
  }

  if (status === 'signedIn' && pendingLink) return <LinkPrompt onDone={back} />;
  if (status === 'signedIn') return justSignedIn ? null : <AccountSettings onLeave={back} />;
  return <AuthForm key={mode} mode={mode} onSignedIn={() => setJustSignedIn(true)} />;
}
