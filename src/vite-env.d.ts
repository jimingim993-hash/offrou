/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase 프로젝트 URL (선택) */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase 공개(anon/publishable) 키 (선택). service_role 키는 절대 넣지 않는다. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
