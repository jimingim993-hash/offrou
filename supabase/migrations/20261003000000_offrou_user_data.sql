-- OFFROU 6단계: 계정별 사용자 데이터
-- 공통 콘텐츠(경험·장면)는 앱에 들어 있고 서버에 복제하지 않는다. 여기에는 사용자 기록만 둔다.
-- 모든 테이블은 RLS로 "로그인한 본인 행"만 읽고 쓸 수 있다.
-- 계정(auth.users)이 지워지면 on delete cascade로 기록도 함께 지워진다.

-- 완료한 시간
create table if not exists public.offrou_completions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  experience_id text not null check (char_length(experience_id) between 1 and 64),
  title text not null check (char_length(title) between 1 and 100),
  category_id text not null check (category_id in ('rest', 'play', 'hobby', 'experience', 'out')),
  minutes integer not null check (minutes between 1 and 600),
  completed_at timestamptz not null,
  mood_id text check (mood_id in ('rest', 'anything', 'new', 'play', 'out', 'bedtime')),
  duration_id text check (duration_id in ('5m', '10m', '30m', '1h', 'any')),
  kind text check (kind in ('guide', 'rest', 'prompts', 'focus', 'story')),
  ending_title text check (char_length(ending_title) <= 100),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- 저장한 시간 (취소는 removed_at으로 남긴다 → 기기 간 병합 시 되살아나지 않음)
create table if not exists public.offrou_saved (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  experience_id text not null check (char_length(experience_id) between 1 and 64),
  saved_at timestamptz not null,
  removed_at timestamptz,
  primary key (user_id, experience_id)
);

-- 완료 후 피드백 (좋았어 / 그냥 그랬어)
create table if not exists public.offrou_feedback (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  record_id text not null check (char_length(record_id) between 1 and 64),
  experience_id text not null check (char_length(experience_id) between 1 and 64),
  category_id text not null check (category_id in ('rest', 'play', 'hobby', 'experience', 'out')),
  value text not null check (value in ('good', 'meh')),
  at timestamptz not null,
  primary key (user_id, record_id)
);

-- 개인화에 필요한 최소 신호 (최근 추천·넘긴 횟수·시작 횟수·최근 본 시간). 사용자당 한 행, 크기 제한.
create table if not exists public.offrou_taste (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 16384),
  updated_at timestamptz not null default now()
);

-- RLS: 본인 행만
alter table public.offrou_completions enable row level security;
alter table public.offrou_saved enable row level security;
alter table public.offrou_feedback enable row level security;
alter table public.offrou_taste enable row level security;

create policy "offrou_completions_own" on public.offrou_completions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "offrou_saved_own" on public.offrou_saved
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "offrou_feedback_own" on public.offrou_feedback
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "offrou_taste_own" on public.offrou_taste
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 비로그인(anon)에는 아무 권한도 주지 않는다
revoke all on public.offrou_completions, public.offrou_saved, public.offrou_feedback, public.offrou_taste from anon;
grant select, insert, update, delete on public.offrou_completions, public.offrou_saved, public.offrou_feedback, public.offrou_taste to authenticated;

-- 계정 삭제: 로그인한 본인 계정만 지운다. 관리자 키 없이 프런트에서 호출 가능.
-- auth.users 행이 지워지면 위 테이블의 기록은 cascade로 함께 지워진다.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
