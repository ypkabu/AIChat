create table if not exists public.session_environment_state (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  scenario_id text not null references public.scenarios(id) on delete cascade,
  session_id text not null references public.play_sessions(id) on delete cascade,
  date text not null default '',
  time text not null default '',
  location text not null default '',
  weather text not null default '',
  scene text not null default '',
  current_objective text not null default '',
  recent_event text not null default '',
  next_pressure text not null default '',
  chapter text not null default '',
  scene_key text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)
);

create table if not exists public.session_character_states (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  scenario_id text not null references public.scenarios(id) on delete cascade,
  session_id text not null references public.play_sessions(id) on delete cascade,
  character_id text not null references public.scenario_characters(id) on delete cascade,
  mood text not null default '',
  condition text not null default '',
  outfit text not null default '',
  pose text not null default '',
  goal text not null default '',
  relationship text not null default '',
  inner_thoughts text not null default '',
  inventory text not null default '',
  hidden_intent text not null default '',
  last_action text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, character_id)
);

create index if not exists session_environment_state_session_idx on public.session_environment_state(session_id);
create index if not exists session_character_states_session_idx on public.session_character_states(session_id, character_id);

alter table public.session_environment_state enable row level security;
alter table public.session_character_states enable row level security;

grant select, insert, update, delete on
  public.session_environment_state,
  public.session_character_states
  to authenticated;

create policy session_environment_state_own_all on public.session_environment_state
  for all to authenticated
  using (exists (select 1 from public.play_sessions ps where ps.id = session_id and ps.user_id = (select auth.uid())))
  with check (exists (select 1 from public.play_sessions ps where ps.id = session_id and ps.user_id = (select auth.uid())));

create policy session_character_states_own_all on public.session_character_states
  for all to authenticated
  using (exists (select 1 from public.play_sessions ps where ps.id = session_id and ps.user_id = (select auth.uid())))
  with check (exists (select 1 from public.play_sessions ps where ps.id = session_id and ps.user_id = (select auth.uid())));

drop trigger if exists session_environment_state_set_updated_at on public.session_environment_state;
create trigger session_environment_state_set_updated_at before update on public.session_environment_state
  for each row execute function public.set_updated_at();

drop trigger if exists session_character_states_set_updated_at on public.session_character_states;
create trigger session_character_states_set_updated_at before update on public.session_character_states
  for each row execute function public.set_updated_at();
