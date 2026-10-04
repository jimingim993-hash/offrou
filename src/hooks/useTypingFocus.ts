import { useEffect, useState } from 'react';

const TEXT_TYPES = new Set(['text', 'email', 'password', 'search', 'tel', 'url', 'number', 'time']);

export const isTextEntry = (el: Element | null): boolean => {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) return TEXT_TYPES.has(el.type) && !el.readOnly && !el.disabled;
  return el instanceof HTMLElement && el.isContentEditable;
};

/**
 * 글자를 입력하는 중인지 (휴대폰 키보드가 올라와 있을 가능성이 큰 상태).
 * 이때는 하단 내비를 숨겨 입력창·버튼이 내비와 키보드 사이에 끼지 않게 한다.
 */
export function useTypingFocus(): boolean {
  const [typing, setTyping] = useState(() => isTextEntry(document.activeElement));
  useEffect(() => {
    const update = () => setTyping(isTextEntry(document.activeElement));
    // focusout 직후에는 activeElement가 body라 다음 요소로 옮겨간 뒤 다시 확인한다
    const onOut = () => setTimeout(update, 0);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', onOut);
    };
  }, []);
  return typing;
}
