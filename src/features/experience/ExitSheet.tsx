import { Button } from '@/components/ui/Button';
import { Sheet, SheetQuietButton } from '@/components/ui/Sheet';

interface ExitSheetProps {
  /** 여기까지를 완료로 남기기 */
  onFinishHere: () => void;
  /** 기록 없이 나가기 */
  onLeave: () => void;
  onStay: () => void;
}

/** 나가기 안내. 실패·패널티 없이 부드럽게. */
export function ExitSheet({ onFinishHere, onLeave, onStay }: ExitSheetProps) {
  return (
    <Sheet title="여기까지만 해도 괜찮아." description="중간에 나가도 아무 일도 생기지 않아." onClose={onStay}>
      <Button block onClick={onFinishHere}>
        여기까지 하고 마치기
      </Button>
      <Button block variant="ghost" onClick={onLeave}>
        그냥 나가기
      </Button>
      <SheetQuietButton onClick={onStay}>계속할래</SheetQuietButton>
    </Sheet>
  );
}
