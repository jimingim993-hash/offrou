import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet, SheetQuietButton } from '@/components/ui/Sheet';
import { resetAllData } from '@/services/storage';
import styles from './MyPage.module.css';

/** 내 OFFROU 기록 초기화. 한 번 더 확인한 뒤 이 기기의 OFFROU 데이터를 모두 지운다. */
export function ResetData() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div className={styles.reset}>
      <button type="button" className={styles.resetButton} onClick={() => setOpen(true)}>
        내 OFFROU 기록 초기화
      </button>
      <p className={styles.resetNote} aria-live="polite">
        {done ? '모두 지웠어. 처음처럼 다시 시작할 수 있어.' : '기록은 이 기기에만 저장돼.'}
      </p>

      {open && (
        <Sheet
          title="내 OFFROU 기록을 모두 지울까?"
          description="지나온 시간, 저장한 시간, 피드백, 추천 기록이 이 기기에서 사라져. 되돌릴 수 없어."
          onClose={() => setOpen(false)}
        >
          <SheetQuietButton onClick={() => setOpen(false)}>그만둘래</SheetQuietButton>
          <Button
            block
            variant="ghost"
            onClick={() => {
              resetAllData();
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
