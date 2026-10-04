-- OFFROU 8단계: 작은 OFFROU 코스 (진행 기록·저장한 코스) + 완료 기록의 코스 연결
-- 20261003000000_offrou_user_data.sql 다음에 실행한다. 모든 테이블은 RLS로 본인 행만 다룬다.

-- 코스 안에서 완료한 기록은 코스 진행 id로 묶인다 (기존 행은 null → 개별 기록)
alter table public.offrou_completions
  add column if not exists course_run_id text check (char_length(course_run_id) <= 64);

-- 코스 진행 기록
create table if not exists public.offrou_course_runs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  course_id text not null check (char_length(course_id) between 1 and 64),
  title text not null check (char_length(title) between 1 and 100),
  vibe text not null check (vibe in ('calm', 'fun', 'new', 'out', 'any')),
  target_minutes integer not null check (target_minutes in (20, 30, 60)),
  step_ids text[] not null check (cardinality(step_ids) between 1 and 6),
  completed_ids text[] not null default '{}' check (cardinality(completed_ids) <= 6),
  started_at timestamptz not null,
  updated_at timestamptz not null,
  ended_at timestamptz,
  primary key (user_id, id)
);

-- 저장한 코스 (취소는 removed_at으로 남긴다)
create table if not exists public.offrou_saved_courses (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  title text not null check (char_length(title) between 1 and 100),
  vibe text not null check (vibe in ('calm', 'fun', 'new', 'out', 'any')),
  target_minutes integer not null check (target_minutes in (20, 30, 60)),
  step_ids text[] not null check (cardinality(step_ids) between 1 and 6),
  saved_at timestamptz not null,
  removed_at timestamptz,
  primary key (user_id, id)
);

alter table public.offrou_course_runs enable row level security;
alter table public.offrou_saved_courses enable row level security;

create policy "offrou_course_runs_own" on public.offrou_course_runs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "offrou_saved_courses_own" on public.offrou_saved_courses
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.offrou_course_runs, public.offrou_saved_courses from anon;
grant select, insert, update, delete on public.offrou_course_runs, public.offrou_saved_courses to authenticated;
