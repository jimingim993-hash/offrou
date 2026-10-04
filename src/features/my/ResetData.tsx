import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet, SheetQuietButton } from '@/components/ui/Sheet';
import { STORAGE_KEYS, resetAllData } from '@/services/storage';
import { useAccount } from '@/features/account/AccountProvider';
import styles from './MyPage.module.css';

/**
 * 이 기기의 OFFROU 기록 초기화. 한 번 더 확인한 뒤 이 기기의 데이터만 지운다.
 * 계정(서버) 데이터는 지우지 않는다 — 계정 삭제는 계정 설정에서 따로 한다.
 */
export function ResetData() {
  const { status } = useAccount();
  const signedIn = status === 'signedIn';
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div className={styles.reset}>
      <button type="button" className={styles.resetButton} onClick={() => setOpen(true)}>
        내 OFFROU 기록 초기화
      </button>
      <p className={styles.resetNote} aria-live="polite">
        {done
          ? signedIn
            ? '이 기기의 기록을 지웠어. 계정 기록은 그대로야.'
            : '모두 지웠어. 처음처럼 다시 시작할 수 있어.'
          : signedIn
            ? '이 기기의 기록만 지워져. 계정 삭제와는 달라.'
            : '기록은 이 기기에만 저장돼.'}
      </p>

      {open && (
        <Sheet
          title="내 OFFROU 기록을 모두 지울까?"
          description={
            signedIn
              ? '이 기기에 남은 지나온 시간, 저장한 시간, 피드백, 추천 기록이 지워져. 계정에 저장된 기록은 지워지지 않아서, 다시 동기화되면 돌아와.'
              : '지나온 시간, 저장한 시간, 피드백, 추천 기록이 이 기기에서 사라져. 되돌릴 수 없어.'
          }
          onClose={() => setOpen(false)}
        >
          <SheetQuietButton onClick={() => setOpen(false)}>그만둘래</SheetQuietButton>
          <Button
            block
            variant="ghost"
            onClick={() => {
              // 로그인 중이면 계정 연결 정보는 남긴다 (서버 데이터는 건드리지 않음)
              // 알림 설정은 기기 설정이라 남긴다 (끄기는 'MY → 새로운 시간 알림'에서)
              resetAllData({ keep: signedIn ? [STORAGE_KEYS.account, STORAGE_KEYS.notify] : [STORAGE_KEYS.notify] });
              setOpen(false);
              setDone(true);
            }}
          >
            모두 지우기
          </Button>
        </Sheet>
      )}
    </div>
  );
}
