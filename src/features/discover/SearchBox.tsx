import { useEffect, useId, useState } from 'react';
import styles from './DiscoverPage.module.css';

interface SearchBoxProps {
  value: string;
  onChange: (q: string) => void;
}

/**
 * 검색 입력. 한글 조합(IME)이 끊기지 않도록 입력값은 로컬 상태로 들고,
 * 바깥(URL) 값이 바뀌면 따라간다.
 */
export function SearchBox({ value, onChange }: SearchBoxProps) {
  const id = useId();
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  const change = (q: string) => {
    setText(q);
    onChange(q);
  };

  return (
    <div className={styles.search} role="search">
      <label htmlFor={id} className="visually-hidden">
        OFFROU 시간 검색
      </label>
      <span className={styles.searchIcon} aria-hidden="true">
        ⌕
      </span>
      <input
        id={id}
        type="search"
        className={styles.searchInput}
        placeholder="산책, 그림, 조용한…"
        value={text}
        enterKeyHint="search"
        autoComplete="off"
        onChange={(e) => change(e.target.value)}
      />
      {text && (
        <button type="button" className={styles.clear} aria-label="검색어 지우기" onClick={() => change('')}>
          ✕
        </button>
      )}
    </div>
  );
}
