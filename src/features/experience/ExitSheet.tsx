import { Button } from '@/components/ui/Button';
import { Sheet, SheetQuietButton } from '@/components/ui/Sheet';

type ExitSheetProps =
  | {
      courseMode?: false;
      /** 여기까지를 완료로 남기기 */
      onFinishHere: () => void;
      /** 기록 없이 나가기 */
      onLeave: () => void;
      onStay: () => void;
    }
  | {
      /** 작은 코스 진행 중 */
      courseMode: true;
      /** 코스를 여기까지만 (이미 마친 시간은 MY에 남는다) */
      onEndCourse: () => void;
      onStay: () => void;
    };

/** 나가기 안내. 실패·패널티 없이 부드럽게. */
export function ExitSheet(props: ExitSheetProps) {
  if (props.courseMode) {
    return (
      <Sheet title="여기까지만 해도 괜찮아." description="지금까지 보낸 시간은 MY OFFROU에 남아." onClose={props.onStay}>
        <Button block onClick={props.onEndCourse}>
          여기까지만 할래
        </Button>
        <SheetQuietButton onClick={props.onStay}>계속할래</SheetQuietButton>
      </Sheet>
    );
  }
  return (
    <Sheet title="여기까지만 해도 괜찮아." description="중간에 나가도 아무 일도 생기지 않아." onClose={props.onStay}>
      <Button block onClick={props.onFinishHere}>
        여기까지 하고 마치기
      </Button>
      <Button block variant="ghost" onClick={props.onLeave}>
        그냥 나가기
      </Button>
      <SheetQuietButton onClick={props.onStay}>계속할래</SheetQuietButton>
    </Sheet>
  );
}
