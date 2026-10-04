import { useId, useState, type InputHTMLAttributes } from 'react';
import styles from './TextField.module.css';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string | null;
  /** 비밀번호 보기 토글 */
  revealable?: boolean;
}

/** 라벨이 보이는 입력칸. 오류는 입력칸과 연결해 읽어준다. */
export function TextField({ label, error, revealable = false, type = 'text', ...rest }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [shown, setShown] = useState(false);

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          id={id}
          type={revealable && shown ? 'text' : type}
          className={`${styles.input} ${error ? styles.invalid : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...rest}
        />
        {revealable && (
          <button
            type="button"
            className={styles.reveal}
            aria-pressed={shown}
            aria-label={shown ? '비밀번호 숨기기' : '비밀번호 보기'}
            onClick={() => setShown((v) => !v)}
          >
            {shown ? '숨기기' : '보기'}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
