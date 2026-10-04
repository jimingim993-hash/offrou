import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAccount } from '@/features/account/AccountProvider';
import { getContentVersion } from '@/services/experiences';
import { collectTechInfo } from '@/services/support/techInfo';
import { REPORT_REASONS } from '@/services/support/types';
import type { Experience } from '@/types/offrou';
import { SUBMIT_ERRORS, submitSupport } from './supportClient';
import { SupportDone } from './SupportPage';
import styles from './support.module.css';

/**
 * 콘텐츠 "문제 알려주기" — 상세·실행 화면 구석의 작은 링크 → 유형 하나 고르고(설명은 선택) 보내기.
 * 같은 문의·운영자 관리센터로 들어간다. 콘텐츠 id·버전·카테고리·화면 정보만 자동으로 붙는다.
 */
export function ReportProblem({ experience }: { experience: Experience }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={styles.reportLink} onClick={() => setOpen(true)}>
        문제 알려주기
      </button>
      {open && <ReportSheet experience={experience} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportSheet({ experience, onClose }: { experience: Experience; onClose: () => void }) {
  const { supportStore, status } = useAccount();
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]['id'] | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const sending = useRef(false);
  const titleId = useId();
  const msgId = useId();

  const send = async () => {
    const r = REPORT_REASONS.find((x) => x.id === reason);
    if (!r || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    const result = await submitSupport(supportStore, {
      type: r.type,
      title: `[콘텐츠] ${experience.title} · ${r.label}`.slice(0, 100),
      message: message.trim() || r.label,
      info: collectTechInfo({
        content_id: experience.id,
        content_version: getContentVersion(experience),
        category: experience.categoryId,
        report_reason: r.id,
      }),
    });
    sending.current = false;
    setBusy(false);
    if (result.ok) setDone(result.requestNumber);
    else setError(SUBMIT_ERRORS[result.reason]);
  };

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <h2 id={titleId} className={styles.sheetTitle}>
          {done ? '알려줘서 고마워. 확인해볼게.' : '어떤 문제가 있었어?'}
        </h2>
        {done ? (
          <>
            <SupportDone requestNumber={done} signedIn={status === 'signedIn'} />
            <button type="button" className={styles.submit} onClick={onClose}>
              닫기
            </button>
          </>
        ) : (
          <>
            <div className={styles.reasons} role="radiogroup" aria-label="문제 유형">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={reason === r.id}
                  className={`${styles.reason} ${reason === r.id ? styles.typeOn : ''}`}
                  onClick={() => setReason(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <label htmlFor={msgId} className={styles.label}>
              조금 더 알려줄래? (선택)
            </label>
            <textarea id={msgId} className={styles.textarea} rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
            <p className={styles.hint}>콘텐츠 정보와 화면 정보만 함께 보내. 직접 쓴 글·그림·사진은 보내지 않아.</p>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <button type="button" className={styles.submit} disabled={!reason || busy} onClick={() => void send()}>
              {busy ? '보내는 중…' : '보내기'}
            </button>
            <button type="button" className={styles.linkQuiet} onClick={onClose}>
              닫기
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
