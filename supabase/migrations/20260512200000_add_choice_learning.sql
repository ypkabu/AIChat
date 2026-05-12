-- Choice Preference Learning tables

create table if not exists choice_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  scenario_id uuid,
  character_id uuid,
  message_id uuid,
  choice_label text not null,
  choice_type text,
  intent text,
  tone text,
  agency text,
  choice_style text,
  progression text,
  romance_level int default 0,
  intimacy_level int default 0,
  risk_level text default 'low',
  effect_json jsonb default '{}'::jsonb,
  context_summary text,
  created_at timestamp with time zone default now()
);

alter table choice_events enable row level security;

create policy "users can manage own choice_events"
  on choice_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on choice_events to authenticated;

create index if not exists choice_events_user_id_idx on choice_events (user_id);
create index if not exists choice_events_session_id_idx on choice_events (session_id);
create index if not exists choice_events_created_at_idx on choice_events (created_at desc);

-- ------------------------------------------------------------------

create table if not exists user_choice_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scope text default 'global',
  scenario_id uuid,
  character_id uuid,

  preferred_intents jsonb default '{}'::jsonb,
  preferred_tones jsonb default '{}'::jsonb,
  preferred_agency jsonb default '{}'::jsonb,
  preferred_choice_styles jsonb default '{}'::jsonb,
  preferred_progression jsonb default '{}'::jsonb,

  romance_preference_score numeric default 0,
  intimacy_preference_score numeric default 0,
  story_progress_preference_score numeric default 0,
  slow_burn_preference_score numeric default 0,

  sample_count int default 0,
  updated_at timestamp with time zone default now(),

  unique (user_id, scope, scenario_id, character_id)
);

alter table user_choice_preferences enable row level security;

create policy "users can manage own user_choice_preferences"
  on user_choice_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on user_choice_preferences to authenticated;

create index if not exists user_choice_preferences_user_id_idx on user_choice_preferences (user_id);
