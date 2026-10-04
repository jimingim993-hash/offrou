/**
 * 문의·오류 접수와 운영자 관리센터 (16단계).
 * 서버(Supabase) 구조: supabase/migrations/20261008000000_offrou_support.sql
 */
export const SUPPORT_TYPES = [
  { id: 'bug', label: '기능이 작동하지 않아요' },
  { id: 'content', label: '콘텐츠에 문제가 있어요' },
  { id: 'display', label: '화면이 이상해요' },
  { id: 'account', label: '로그인/계정 문제' },
  { id: 'data', label: '기록이나 저장 데이터 문제' },
  { id: 'pwa', label: 'PWA/설치 문제' },
  { id: 'notification', label: '알림 문제' },
  { id: 'howto', label: '이용 방법 문의' },
  { id: 'suggestion', label: '개선 제안' },
  { id: 'other', label: '기타' },
] as const;

export type SupportType = (typeof SUPPORT_TYPES)[number]['id'];

export const SUPPORT_STATUSES = [
  { id: 'new', label: '접수됨' },
  { id: 'checking', label: '확인 중' },
  { id: 'in_progress', label: '처리 중' },
  { id: 'resolved', label: '처리 완료' },
  { id: 'closed', label: '종료' },
] as const;

export type SupportStatus = (typeof SUPPORT_STATUSES)[number]['id'];

export const SUPPORT_PRIORITIES = [
  { id: 'urgent', label: '긴급' },
  { id: 'high', label: '높음' },
  { id: 'normal', label: '보통' },
  { id: 'low', label: '낮음' },
] as const;

export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number]['id'];

/** 콘텐츠 "문제 알려주기"의 간단한 유형 */
export const REPORT_REASONS = [
  { id: 'not-working', label: '실행이 안 돼요', type: 'bug' },
  { id: 'content-odd', label: '내용이 이상해요', type: 'content' },
  { id: 'time-off', label: '예상 시간이 맞지 않아요', type: 'content' },
  { id: 'screen-odd', label: '화면이 이상해요', type: 'display' },
  { id: 'other', label: '기타', type: 'other' },
] as const satisfies readonly { id: string; label: string; type: SupportType }[];

/** 문제 해결에만 쓰는 기술 정보. 비밀번호·토큰·위치·작성한 글·사진은 담지 않는다. */
export interface SupportTechInfo {
  app_version: string;
  route: string;
  browser: string;
  os: string;
  is_pwa: boolean;
  screen: string;
  content_id?: string;
  content_version?: number;
  category?: string;
  report_reason?: string;
  error_code?: string;
}

export interface SupportSubmission {
  type: SupportType;
  title: string;
  message: string;
  email?: string;
  info: SupportTechInfo;
}

/** 사용자가 보는 내 문의 */
export interface MySupportRequest {
  requestNumber: string;
  title: string;
  type: SupportType;
  status: SupportStatus;
  reply: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 운영자가 보는 요청 (서버 행 그대로) */
export interface AdminSupportRequest {
  id: string;
  request_number: string;
  user_id: string | null;
  email: string | null;
  type: SupportType;
  title: string;
  message: string;
  status: SupportStatus;
  priority: SupportPriority;
  reply: string | null;
  content_id: string | null;
  content_version: number | null;
  category: string | null;
  report_reason: string | null;
  error_code: string | null;
  app_version: string | null;
  route: string | null;
  browser: string | null;
  os: string | null;
  is_pwa: boolean | null;
  screen: string | null;
  is_guest: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportNote {
  id: string;
  request_id: string;
  admin_user_id: string | null;
  note: string;
  created_at: string;
}

export interface SupportHistory {
  id: string;
  request_id: string;
  previous_status: SupportStatus | null;
  new_status: SupportStatus;
  changed_by: string | null;
  created_at: string;
}

export interface AdminFilter {
  status?: SupportStatus;
  type?: SupportType;
  priority?: SupportPriority;
  /** 접수번호 또는 제목 */
  q?: string;
}

/** 사용자 쪽 저장소 (비회원도 접수 가능) */
export interface SupportStore {
  submit(input: SupportSubmission): Promise<{ requestNumber: string }>;
  /** 로그인 사용자의 내 문의 (서버 RLS: 자기 것만) */
  listMine(): Promise<MySupportRequest[]>;
}

/** 운영자 쪽 저장소. 모든 권한은 서버(RLS·is_offrou_admin)에서 다시 검사된다. */
export interface AdminStore {
  isAdmin(): Promise<boolean>;
  list(filter?: AdminFilter): Promise<AdminSupportRequest[]>;
  get(id: string): Promise<AdminSupportRequest | null>;
  update(id: string, patch: Partial<Pick<AdminSupportRequest, 'status' | 'priority' | 'reply'>>): Promise<void>;
  notes(id: string): Promise<SupportNote[]>;
  addNote(id: string, note: string): Promise<void>;
  history(id: string): Promise<SupportHistory[]>;
}

export const typeLabel = (id: string) => SUPPORT_TYPES.find((t) => t.id === id)?.label ?? id;
export const statusLabel = (id: string) => SUPPORT_STATUSES.find((s) => s.id === id)?.label ?? id;
export const priorityLabel = (id: string) => SUPPORT_PRIORITIES.find((p) => p.id === id)?.label ?? id;
