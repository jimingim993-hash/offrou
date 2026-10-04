-- OFFROU 16단계: 문의·오류 접수 + 운영자 요청 관리센터
-- 20261007000000_offrou_hobby_kind.sql 다음에 실행한다. 기존 테이블·데이터는 건드리지 않는다 (새 테이블만 추가).
--
-- 보안 구조
-- - 운영자 권한은 offrou_admins 테이블에만 있다. 이 테이블에는 앱(anon/authenticated)이 직접 접근할 수 없다.
--   운영자 지정은 Supabase SQL Editor(관리자)에서만: insert into public.offrou_admins (user_id) values ('<auth.users id>');
-- - 접수는 submit_support_request() 함수로만 (비회원 포함). 함수가 길이·종류 검사와 빈도 제한을 한다.
-- - 일반 사용자는 자기 문의만 조회. 수정·삭제 불가. 운영자 메모·이력은 운영자만.
-- - 운영자 여부는 서버 함수 is_offrou_admin()이 판단한다 (프런트의 버튼 숨김이 아니라 RLS로 막는다).

-- ─── 운영자 ───
create table if not exists public.offrou_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.offrou_admins enable row level security;
revoke all on public.offrou_admins from anon, authenticated;

create or replace function public.is_offrou_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.offrou_admins where user_id = auth.uid());
$$;
revoke all on function public.is_offrou_admin() from public;
grant execute on function public.is_offrou_admin() to anon, authenticated;

-- ─── 문의 ───
create table if not exists public.offrou_support_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  email text check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  type text not null check (type in ('bug', 'content', 'display', 'account', 'data', 'pwa', 'notification', 'howto', 'suggestion', 'other')),
  title text not null check (char_length(title) between 1 and 100),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'new' check (status in ('new', 'checking', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('urgent', 'high', 'normal', 'low')),
  -- 운영자 답변 (로그인 사용자는 '내 문의'에서 본다. 이메일 발송은 하지 않는다)
  reply text check (reply is null or char_length(reply) <= 2000),
  -- 문제 해결용 기술 정보만 (비밀번호·토큰·위치·작성한 글은 받지 않는다)
  content_id text check (content_id is null or char_length(content_id) <= 64),
  content_version integer,
  category text check (category is null or char_length(category) <= 20),
  report_reason text check (report_reason is null or char_length(report_reason) <= 40),
  error_code text check (error_code is null or char_length(error_code) <= 20),
  app_version text check (app_version is null or char_length(app_version) <= 20),
  route text check (route is null or char_length(route) <= 200),
  browser text check (browser is null or char_length(browser) <= 40),
  os text check (os is null or char_length(os) <= 40),
  is_pwa boolean,
  screen text check (screen is null or char_length(screen) <= 20),
  is_guest boolean not null default true,
  -- 빈도 제한용 (날짜별 IP 해시, 원래 IP는 저장하지 않는다)
  client_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists offrou_support_requests_user_idx on public.offrou_support_requests (user_id);
create index if not exists offrou_support_requests_status_idx on public.offrou_support_requests (status, created_at desc);
create index if not exists offrou_support_requests_client_idx on public.offrou_support_requests (client_key, created_at desc);

create table if not exists public.offrou_support_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.offrou_support_requests (id) on delete cascade,
  admin_user_id uuid references auth.users (id) on delete set null,
  note text not null check (char_length(note) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.offrou_support_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.offrou_support_requests (id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.offrou_support_requests enable row level security;
alter table public.offrou_support_notes enable row level security;
alter table public.offrou_support_history enable row level security;

-- 조회: 자기 문의 또는 운영자 / 수정: 운영자만 / 직접 추가·삭제: 없음 (추가는 함수로만)
create policy "support_select_own_or_admin" on public.offrou_support_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_offrou_admin()));
create policy "support_update_admin" on public.offrou_support_requests
  for update to authenticated
  using ((select public.is_offrou_admin()))
  with check ((select public.is_offrou_admin()));
create policy "support_notes_admin" on public.offrou_support_notes
  for all to authenticated
  using ((select public.is_offrou_admin()))
  with check ((select public.is_offrou_admin()));
create policy "support_history_admin_select" on public.offrou_support_history
  for select to authenticated
  using ((select public.is_offrou_admin()));

revoke all on public.offrou_support_requests, public.offrou_support_notes, public.offrou_support_history from anon;
grant select, update on public.offrou_support_requests to authenticated;
grant select, insert on public.offrou_support_notes to authenticated;
grant select on public.offrou_support_history to authenticated;

-- 상태가 바뀌면 이력을 남기고 수정 시각을 갱신한다 (운영자가 고칠 수 없는 열은 되돌린다)
create or replace function public.offrou_support_on_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.id := old.id;
  new.request_number := old.request_number;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.client_key := old.client_key;
  new.updated_at := now();
  if new.status is distinct from old.status then
    insert into public.offrou_support_history (request_id, previous_status, new_status, changed_by)
    values (old.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;
drop trigger if exists offrou_support_on_update on public.offrou_support_requests;
create trigger offrou_support_on_update
  before update on public.offrou_support_requests
  for each row execute function public.offrou_support_on_update();

-- 접수 (비회원·로그인 모두). 접수번호를 돌려준다.
create or replace function public.submit_support_request(
  p_type text,
  p_title text,
  p_message text,
  p_email text default null,
  p_info jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ip text := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  ckey text := encode(extensions.digest(coalesce(nullif(ip, ''), 'unknown') || to_char(now(), 'YYYYMMDD'), 'sha256'), 'hex');
  num text;
  recent int;
begin
  -- 빈도 제한: 같은 계정 또는 같은 접속 주소에서 10분에 5건, 하루 30건까지
  select count(*) into recent from public.offrou_support_requests
    where (uid is not null and user_id = uid or client_key = ckey) and created_at > now() - interval '10 minutes';
  if recent >= 5 then raise exception 'rate_limited'; end if;
  select count(*) into recent from public.offrou_support_requests
    where (uid is not null and user_id = uid or client_key = ckey) and created_at > now() - interval '1 day';
  if recent >= 30 then raise exception 'rate_limited'; end if;

  num := 'OFF-' || to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD') || '-' || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6));

  insert into public.offrou_support_requests (
    request_number, user_id, email, type, title, message,
    content_id, content_version, category, report_reason, error_code,
    app_version, route, browser, os, is_pwa, screen, is_guest, client_key
  ) values (
    num, uid, nullif(trim(p_email), ''), p_type, trim(p_title), trim(p_message),
    p_info ->> 'content_id', (p_info ->> 'content_version')::int, p_info ->> 'category', p_info ->> 'report_reason', p_info ->> 'error_code',
    p_info ->> 'app_version', p_info ->> 'route', p_info ->> 'browser', p_info ->> 'os', (p_info ->> 'is_pwa')::boolean, p_info ->> 'screen',
    uid is null, ckey
  );
  return num;
end;
$$;
revoke all on function public.submit_support_request(text, text, text, text, jsonb) from public;
grant execute on function public.submit_support_request(text, text, text, text, jsonb) to anon, authenticated;
