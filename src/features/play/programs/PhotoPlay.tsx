import { useState } from 'react';
import { PHOTO_MISSIONS } from '@/data/play/pools';
import { pickOne } from '@/services/random';
import { Actions, Lead, PlayButton, type PlayViewProps } from '../parts';
import styles from '../play.module.css';

/**
 * 사진 미션 — 카메라를 열거나 사진을 올리지 않는다. 직접 찾아보고 "찾았어"로 끝낼 수 있다.
 * (이후 사진 기능을 붙인다면 'searching' 단계에 선택형으로 더한다)
 */
export function PhotoPlay({ program, onDone }: PlayViewProps) {
  const [mission, setMission] = useState(() => pickOne(PHOTO_MISSIONS));
  const [searching, setSearching] = useState(false);

  return (
    <>
      <p className={styles.eyebrow}>오늘의 사진 미션</p>
      <p className={styles.big}>{mission}</p>
      {!searching ? (
        <>
          <Lead>{`주변에서 ${mission}을(를) 찾아봐.`}</Lead>
          <Actions>
            <PlayButton onClick={() => setSearching(true)}>찾으러 갈래</PlayButton>
            <PlayButton variant="ghost" onClick={() => setMission((m) => pickOne(PHOTO_MISSIONS, Math.random, m))}>
              다른 미션
            </PlayButton>
          </Actions>
        </>
      ) : (
        <>
          <Lead>{program.instruction}</Lead>
          <p className={styles.hint}>사진은 OFFROU에 올라가지 않아. 다른 사람이나 위험한 곳은 찍지 않기.</p>
          <Actions>
            <PlayButton onClick={onDone}>찾았어</PlayButton>
          </Actions>
        </>
      )}
    </>
  );
}
