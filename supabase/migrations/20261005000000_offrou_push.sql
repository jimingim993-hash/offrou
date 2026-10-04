-- OFFROU 9단계: "새로운 시간" 알림 구독 (선택 기능, 기본 꺼짐)
-- 20261004000000_offrou_courses.sql 다음에 실행한다.
-- - 사용자가 MY에서 직접 켠 경우에만 행이 생긴다. 시간을 고르기 전에는 아무것도 저장하지 않는다.
-- - 브라우저 구독 정보(endpoint, 공개 키 p256dh, auth)와 사용자가 고른 시간·빈도·시간대만 둔다.
-- - 사용자는 RLS로 자기 구독만 읽고 지울 수 있다. 발송은 Edge Function(send-new-time)이 service role로 한다.
-- - 계정을 삭제하면 on delete cascade로 함께 지워진다.

create table if not exists public.offrou_push_subscriptions (
  endpoint text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  notify_time text not null check (notify_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  frequency text not null default 'daily' check (frequency in ('daily', 'sometimes')),
  timezone text not null default 'Asia/Seoul' check (char_length(timezone) between 1 and 64),
  -- 같은 날 두 번 보내지 않기 위한 표시 (사용자 시간대 기준 날짜)
  last_sent_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offrou_push_subscriptions_user_idx on public.offrou_push_subscriptions (user_id);

alter table public.offrou_push_subscriptions enable row level security;

create policy "offrou_push_subscriptions_select_own" on public.offrou_push_subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "offrou_push_subscriptions_delete_own" on public.offrou_push_subscriptions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 저장·수정은 아래 함수로만 (같은 브라우저 구독이 다른 계정에 남아 있으면 정리한 뒤 저장)
revoke all on public.offrou_push_subscriptions from anon, authenticated;
grant select, delete on public.offrou_push_subscriptions to authenticated;

create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_time text,
  p_frequency text,
  p_timezone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  -- 잘못된 시간대 이름은 저장하지 않는다
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'invalid timezone';
  end if;

  insert into public.offrou_push_subscriptions as s
    (endpoint, user_id, p256dh, auth, notify_time, frequency, timezone, updated_at)
  values
    (p_endpoint, uid, p_p256dh, p_auth, p_time, p_frequency, p_timezone, now())
  on conflict (endpoint) do update set
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    notify_time = excluded.notify_time,
    frequency = excluded.frequency,
    timezone = excluded.timezone,
    -- 다른 계정에서 넘어온 구독이면 발송 기록도 새로 시작
    last_sent_on = case when s.user_id = excluded.user_id then s.last_sent_on else null end,
    updated_at = now();
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text, text, text) to authenticated;

-- ─── (선택) 15분마다 발송 함수 실행 ───
-- Edge Function 배포와 secret 등록을 마친 뒤, SQL Editor에서 pg_cron·pg_net 확장을 켜고 아래를 실행한다.
-- <project-ref>와 <CRON_SECRET>은 직접 채운다. (이 파일에서는 실행되지 않도록 주석으로 둔다)
--
-- select cron.schedule(
--   'offrou-send-new-time',
--   '*/15 * * * *',
--   $cron$
--   select net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/send-new-time',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
--     body := '{}'::jsonb
--   );
--   $cron$
-- );
