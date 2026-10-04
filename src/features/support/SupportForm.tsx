import { useId, useMemo, useRef, useState } from 'react';
import { collectTechInfo } from '@/services/support/techInfo';
import { SUPPORT_TYPES, type SupportStore, type SupportTechInfo, type SupportType } from '@/services/support/types';
import { SUBMIT_ERRORS, submitSupport } from './supportClient';
import styles from './support.module.css';

const TITLE_MAX = 100;
const MESSAGE_MAX = 2000;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** 오류 신고일 때만 콘텐츠·화면 정보를 함께 보낸다 */
const TECH_TYPES: SupportType[] = ['bug', 'content', 'display', 'data', 'pwa', 'notification', 'account'];

/**
 * 문의 및 문제 신고 양식. 실패해도 쓴 내용은 그대로 둔다. 연속 클릭으로 같은 문의가 여러 건 생기지 않게 한다.
 * 비밀번호·토큰·위치·작성한 글·사진 등은 보내지 않는다 — 보내는 기술 정보는 화면에 그대로 보여준다.
 */
export function SupportForm({
  store,
  initialType = 'bug',
  extraInfo = {},
  onDone,
}: {
  store: SupportStore | null;
  initialType?: SupportType;
  extraInfo?: Partial<SupportTechInfo>;
  onDone: (requestNumber: string) => void;
}) {
  const [type, setType] = useState<SupportType>(initialType);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const sending = useRef(false);
  const ids = { type: useId(), title: useId(), message: useId(), email: useId(), err: useId() };

  const info = useMemo(() => collectTechInfo(TECH_TYPES.includes(type) ? extraInfo : { error_code: extraInfo.error_code }), [type, extraInfo]);
  const titleError = touched && !title.trim() ? '제목을 적어줘.' : null;
  const messageError = touched && !message.trim() ? '내용을 적어줘.' : null;
  const emailError = email.trim() && !EMAIL_RE.test(email.trim()) ? '이메일 형식을 확인해줘.' : null;

  const submit = async () => {
    setTouched(true);
    if (sending.current) return; // 연속 클릭 방지
    if (!title.trim() || !message.trim() || emailError) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    const result = await submitSupport(store, { type, title: title.trim(), message: message.trim(), email: email.trim() || undefined, info });
    sending.current = false;
    setBusy(false);
    if (result.ok) onDone(result.requestNumber);
    else setError(SUBMIT_ERRORS[result.reason]);
  };

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>문의 유형</legend>
        <div className={styles.types}>
          {SUPPORT_TYPES.map((t) => (
            <label key={t.id} className={`${styles.type} ${type === t.id ? styles.typeOn : ''}`}>
              <input type="radio" name={ids.type} value={t.id} checked={type === t.id} onChange={() => setType(t.id)} />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor={ids.title} className={styles.label}>
          제목
        </label>
        <input
          id={ids.title}
          className={styles.input}
          value={title}
          maxLength={TITLE_MAX}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? `${ids.title}-e` : undefined}
          onChange={(e) => setTitle(e.target.value)}
        />
        {titleError && (
          <p id={`${ids.title}-e`} className={styles.fieldError}>
            {titleError}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor={ids.message} className={styles.label}>
          내용
        </label>
        <textarea
          id={ids.message}
          className={styles.textarea}
          rows={6}
          value={message}
          maxLength={MESSAGE_MAX}
          aria-invalid={messageError ? true : undefined}
          aria-describedby={messageError ? `${ids.message}-e` : undefined}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className={styles.counter}>{`${message.length} / ${MESSAGE_MAX}`}</p>
        {messageError && (
          <p id={`${ids.message}-e`} className={styles.fieldError}>
            {messageError}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor={ids.email} className={styles.label}>
          답변 받을 이메일 (선택)
        </label>
        <input
          id={ids.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          className={styles.input}
          value={email}
          aria-invalid={emailError ? true : undefined}
          onChange={(e) => setEmail(e.target.value)}
        />
        {emailError ? (
          <p className={styles.fieldError}>{emailError}</p>
        ) : (
          <p className={styles.hint}>지금은 이메일을 자동으로 보내지 않아. 운영자가 확인할 때 참고해.</p>
        )}
      </div>

      <details className={styles.details}>
        <summary>함께 보내는 정보</summary>
        <ul className={styles.infoList} aria-label="함께 보내는 정보">
          <li>{`앱 버전 ${info.app_version}`}</li>
          <li>{`화면 ${info.route}`}</li>
          <li>{`${info.browser} · ${info.os}${info.is_pwa ? ' · 설치형 앱' : ''} · ${info.screen}`}</li>
          {info.content_id && <li>{`콘텐츠 ${info.content_id} (v${info.content_version ?? 1})`}</li>}
          {info.error_code && <li>{`오류 코드 ${info.error_code}`}</li>}
        </ul>
        <p className={styles.hint}>비밀번호, 위치, 직접 쓴 글·그림·사진은 보내지 않아.</p>
      </details>

      {error && (
        <p id={ids.err} className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={styles.submit} disabled={busy}>
        {busy ? '보내는 중…' : '접수하기'}
      </button>
    </form>
  );
}
