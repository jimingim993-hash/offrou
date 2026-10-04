import type { RemoteStore } from '../sync/engine';

/** 화면이 아는 사용자 정보는 이게 전부다 (이름·연락처 등은 받지 않는다) */
export interface AuthUser {
  id: string;
  email: string;
}

export type AuthEvent = 'signed_in' | 'signed_out' | 'password_recovery' | 'other';

export interface SignUpResult {
  user: AuthUser | null;
  /** 이메일 인증이 켜져 있으면 메일 확인 전까지 로그인 세션이 없다 */
  needsEmailConfirm: boolean;
}

/**
 * 인증 + 원격 저장 백엔드. 화면은 이 인터페이스만 쓴다.
 * 지금은 Supabase 구현(supabaseBackend)과 테스트용 메모리 구현이 있다.
 * 소셜 로그인 등은 여기에 메서드를 더하는 식으로 확장한다.
 */
export interface AccountBackend {
  /** 저장된 세션 복원. 만료·오류면 null (앱을 멈추지 않는다) */
  getUser(): Promise<AuthUser | null>;
  onAuthChange(listener: (user: AuthUser | null, event: AuthEvent) => void): () => void;
  signUp(email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  /** 비밀번호 재설정 메일 보내기 */
  requestPasswordReset(email: string): Promise<void>;
  /** 로그인(또는 재설정 링크) 상태에서 새 비밀번호로 바꾸기 */
  updatePassword(password: string): Promise<void>;
  /** 계정과 서버의 개인 기록 삭제 (서버 측 함수로 처리) */
  deleteAccount(): Promise<void>;
  remote: RemoteStore;
}
