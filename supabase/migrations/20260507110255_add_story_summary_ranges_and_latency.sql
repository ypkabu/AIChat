alter table public.story_summaries
  add column if not exists start_turn_index integer not null default 1,
  add column if not exists end_turn_index integer not null default 1,
  add column if not exists updated_at timestamptz not null default now();

alter table public.usage_logs
  add column if not exists latency_ms integer;

create index if not exists story_summaries_session_turn_idx
  on public.story_summaries(session_id, start_turn_index, end_turn_index);
