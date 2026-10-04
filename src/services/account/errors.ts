/**
 * 인증·동기화 오류를 사용자 문장으로 바꾼다.
 * 개발자용 원문(AuthApiError 등)은 화면에 보이지 않고, 개발 모드 콘솔에서만 확인한다.
 * 비밀번호·토큰은 어디에도 기록하지 않는다.
 */
export type AccountErrorCode =
  | 'invalid_credentials'
  | 'email_taken'
  | 'weak_password'
  | 'invalid_email'
  | 'email_not_confirmed'
  | 'rate_limited'
  | 'session_expired'
  | 'network'
  | 'unknown';

export class AccountError extends Error {
  constructor(
    public readonly code: AccountErrorCode,
    cause?: unknown,
  ) {
    super(code);
    this.name = 'AccountError';
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

export const ERROR_MESSAGES: Record<AccountErrorCode, string> = {
  invalid_credentials: '이메일이나 비밀번호를 다시 확인해줘.',
  email_taken: '이미 쓰고 있는 이메일이야. 로그인해볼래?',
  weak_password: '비밀번호를 조금 더 길고 복잡하게 만들어줘.',
  invalid_email: '이메일 형식을 다시 확인해줘.',
  email_not_confirmed: '메일함에서 인증 링크를 먼저 눌러줘.',
  rate_limited: '잠깐 쉬었다가 다시 시도해줘.',
  session_expired: '로그인이 만료됐어. 다시 로그인해줘.',
  network: '지금은 연결이 조금 불안정해. 잠시 후 다시 시도해줘.',
  unknown: '잠시 문제가 생겼어. 잠시 후 다시 시도해줘.',
};

export function messageFor(error: unknown): string {
  if (import.meta.env.DEV && !(error instanceof AccountError && !error.cause)) {
    // 개발 중 디버깅용 (원문 오류만, 입력값은 남기지 않는다)
    console.warn('[OFFROU account]', error instanceof AccountError ? error.cause : error);
  }
  return ERROR_MESSAGES[toAccountError(error).code];
}

export function toAccountError(error: unknown): AccountError {
  if (error instanceof AccountError) return error;
  if (isNetworkError(error)) return new AccountError('network', error);
  return new AccountError('unknown', error);
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof AccountError) return error.code === 'network';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const e = error as { name?: string; message?: string; status?: number } | null;
  return (
    !!e &&
    (e.name === 'AuthRetryableFetchError' ||
      e.name === 'TypeError' ||
      e.status === 0 ||
      /fetch|network|failed to fetch|load failed/i.test(e.message ?? ''))
  );
}

/* ─── 입력값 기본 검증 ─── */

export const PASSWORD_MIN = 8;
/** bcrypt 한계 */
export const PASSWORD_MAX = 72;

export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return '이메일을 입력해줘.';
  if (v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return ERROR_MESSAGES.invalid_email;
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return '비밀번호를 입력해줘.';
  if (password.length < PASSWORD_MIN) return `비밀번호는 ${PASSWORD_MIN}자 이상으로 만들어줘.`;
  if (password.length > PASSWORD_MAX) return `비밀번호는 ${PASSWORD_MAX}자 이하로 만들어줘.`;
  return null;
}
