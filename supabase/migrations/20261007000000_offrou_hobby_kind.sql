-- OFFROU 11단계: 실행형 HOBBY 완료 기록의 실행 방식(kind)에 'hobby'를 허용한다.
-- 20261006000000_offrou_play_kind.sql 다음에 실행한다. 기존 행은 바뀌지 않는다.
-- (실행 전에도 앱은 동작한다: 서버가 거부하면 그 기록의 kind만 비워서 다시 올린다)

alter table public.offrou_completions drop constraint if exists offrou_completions_kind_check;
alter table public.offrou_completions
  add constraint offrou_completions_kind_check
  check (kind in ('guide', 'rest', 'prompts', 'focus', 'story', 'play', 'hobby'));
