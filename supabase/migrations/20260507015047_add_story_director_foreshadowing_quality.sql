alter table public.play_sessions
  add column if not exists current_beat_index integer not null default 0,
  add column if not exists scene_turn_count integer not null default 0,
  add column if not exists stall_count integer not null default 0,
  add column if not exists last_conflict text not null default '',
  add column if not exists last_hook text not null default '',
  add column if not exists objective_completed boolean not null default false,
  add column if not exists last_director_reason text,
  add column if not exists last_quality_score integer,
  add column if not exists quality_stall_count integer not null default 0,
  add column if not exists last_quality_problem text,
  add column if not exists last_improvement_hint text;

alter table public.app_settings
  add column if not exists story_director_debug_enabled boolean not null default false;

alter table public.play_sessions
  drop constraint if exists play_sessions_current_beat_index_check,
  add constraint play_sessions_current_beat_index_check check (current_beat_index >= 0),
  drop constraint if exists play_sessions_scene_turn_count_check,
  add constraint play_sessions_scene_turn_count_check check (scene_turn_count >= 0),
  drop constraint if exists play_sessions_stall_count_check,
  add constraint play_sessions_stall_count_check check (stall_count >= 0),
  drop constraint if exists play_sessions_last_quality_score_check,
  add constraint play_sessions_last_quality_score_check check (last_quality_score is null or last_quality_score between 0 and 100),
  drop constraint if exists play_sessions_quality_stall_count_check,
  add constraint play_sessions_quality_stall_count_check check (quality_stall_count >= 0);

create table if not exists public.story_scenes (
  id text primary key default gen_random_uuid()::text,
  scenario_id text not null references public.scenarios(id) on delete cascade,
  scene_key text not null,
  title text not null default '',
  objective text not null default '',
  conflict text not null default '',
  hook text not null default '',
  target_turns integer not null default 4,
  max_turns integer not null default 6,
  beats jsonb not null default '[]'::jsonb,
  next_scene_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scenario_id, scene_key),
  constraint story_scenes_turns_check check (target_turns >= 1 and max_turns >= target_turns),
  constraint story_scenes_beats_array_check check (jsonb_typeof(beats) = 'array')
);

create table if not exists public.foreshadowing_items (
  id text primary key default gen_random_uuid()::text,
  scenario_id text not null references public.scenarios(id) on delete cascade,
  session_id text references public.play_sessions(id) on delete cascade,
  title text not null,
  clue_text text not null,
  hidden_truth text,
  related_character_id text references public.scenario_characters(id) on delete set null,
  related_lore_entry_id text references public.lorebook_entries(id) on delete set null,
  introduced_at_message_id text references public.messages(id) on delete set null,
  introduced_scene_key text,
  planned_reveal_scene_key text,
  reveal_condition_json jsonb not null default '{}'::jsonb,
  importance integer not null default 3,
  status text not null default 'planned',
  visibility text not null default 'hidden_to_user',
  last_reinforced_at timestamptz,
  revealed_at timestamptz,
  reveal_readiness text not null default 'not_ready',
  reinforcement_count integer not null default 0,
  turns_since_introduced integer not null default 0,
  overdue_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint foreshadowing_items_importance_check check (importance between 1 and 5),
  constraint foreshadowing_items_status_check check (status in ('planned', 'introduced', 'developing', 'ready', 'revealed', 'discarded')),
  constraint foreshadowing_items_visibility_check check (visibility in ('hidden_to_user', 'visible_hint', 'debug_only')),
  constraint foreshadowing_items_reveal_readiness_check check (reveal_readiness in ('not_ready', 'warming_up', 'ready', 'overdue')),
  constraint foreshadowing_items_reinforcement_count_check check (reinforcement_count >= 0),
  constraint foreshadowing_items_turns_since_introduced_check check (turns_since_introduced >= 0),
  constraint foreshadowing_items_overdue_score_check check (overdue_score >= 0)
);

create table if not exists public.narrative_quality_logs (
  id text primary key default gen_random_uuid()::text,
  session_id text not null references public.play_sessions(id) on delete cascade,
  message_id text references public.messages(id) on delete set null,
  quality_score integer not null default 0,
  is_repetitive boolean not null default false,
  is_stalling boolean not null default false,
  has_new_information boolean not null default false,
  has_character_action boolean not null default false,
  has_emotional_change boolean not null default false,
  has_relationship_change boolean not null default false,
  has_scene_change boolean not null default false,
  has_foreshadowing boolean not null default false,
  has_choice_pressure boolean not null default false,
  has_forward_motion boolean not null default false,
  scene_objective_progress text not null default 'low',
  problem text,
  improvement_hint text,
  created_at timestamptz not null default now(),
  constraint narrative_quality_logs_quality_score_check check (quality_score between 0 and 100),
  constraint narrative_quality_logs_scene_objective_progress_check check (scene_objective_progress in ('low', 'medium', 'high'))
);

create index if not exists story_scenes_scenario_key_idx on public.story_scenes(scenario_id, scene_key);
create index if not exists foreshadowing_items_scenario_status_idx on public.foreshadowing_items(scenario_id, status, importance desc);
create index if not exists foreshadowing_items_session_status_idx on public.foreshadowing_items(session_id, status);
create index if not exists foreshadowing_items_reveal_scene_idx on public.foreshadowing_items(scenario_id, planned_reveal_scene_key);
create index if not exists narrative_quality_logs_session_created_at_idx on public.narrative_quality_logs(session_id, created_at desc);

drop trigger if exists story_scenes_set_updated_at on public.story_scenes;
create trigger story_scenes_set_updated_at before update on public.story_scenes
  for each row execute function public.set_updated_at();

drop trigger if exists foreshadowing_items_set_updated_at on public.foreshadowing_items;
create trigger foreshadowing_items_set_updated_at before update on public.foreshadowing_items
  for each row execute function public.set_updated_at();

alter table public.story_scenes enable row level security;
alter table public.foreshadowing_items enable row level security;
alter table public.narrative_quality_logs enable row level security;

grant select, insert, update, delete on
  public.story_scenes,
  public.foreshadowing_items,
  public.narrative_quality_logs
to authenticated;

create policy story_scenes_own_all on public.story_scenes
  for all to authenticated
  using (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));

create policy foreshadowing_items_own_all on public.foreshadowing_items
  for all to authenticated
  using (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));

create policy narrative_quality_logs_own_all on public.narrative_quality_logs
  for all to authenticated
  using (exists (select 1 from public.play_sessions ps where ps.id = session_id and ps.user_id = (select auth.uid())))
  with check (exists (select 1 from public.play_sessions ps where ps.id = session_id and ps.user_id = (select auth.uid())));
