-- Story roleplay PWA initial schema.
-- Supabase notes checked 2026-05-07 JST:
-- - RLS must be enabled for public schema tables exposed through the Data API.
-- - New tables may not be exposed to the Data API automatically, so authenticated
--   grants are explicit in this migration.
-- - Storage upsert needs SELECT + INSERT + UPDATE policies on storage.objects.

create extension if not exists pgcrypto;
create schema if not exists private;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do nothing;

  insert into public.app_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  adult_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  world_setting text not null default '',
  situation text not null default '',
  relationship_setup text not null default '',
  objective text not null default '',
  forbidden_content text not null default '',
  visibility text not null default 'private' check (visibility in ('private', 'unlisted')),
  tags text[] not null default '{}',
  genre text not null default '',
  content_warnings text not null default '',
  estimated_play_time text not null default '',
  recommended_tone text not null default '',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  last_played_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scenario_characters (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  name text not null,
  avatar_url text,
  avatar_storage_path text,
  display_color text not null default '#5eead4',
  appearance text not null default '',
  personality text not null default '',
  speaking_style text not null default '',
  first_person text not null default '',
  user_call_name text not null default '',
  role text not null default '',
  background text not null default '',
  likes text not null default '',
  dislikes text not null default '',
  secrets text not null default '',
  sample_dialogues text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  avatar_storage_path text,
  first_person text not null default '',
  speaking_style text not null default '',
  personality text not null default '',
  role text not null default '',
  background text not null default '',
  relationship_to_characters text not null default '',
  roleplay_policy text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lorebook_entries (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  title text not null,
  content text not null default '',
  keywords text[] not null default '{}',
  importance integer not null default 3 check (importance between 1 and 5),
  always_include boolean not null default false,
  related_character_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.style_settings (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null unique references public.scenarios(id) on delete cascade,
  narration_perspective text not null default 'third_person' check (narration_perspective in ('first_person', 'second_person', 'third_person')),
  tense text not null default 'present' check (tense in ('past', 'present')),
  response_length text not null default 'auto' check (response_length in ('short', 'medium', 'long', 'auto')),
  expression_style text not null default 'balanced' check (expression_style in ('dialogue_heavy', 'balanced', 'action_heavy')),
  moods text[] not null default '{}',
  prose_style text not null default 'none',
  provide_choices boolean not null default true,
  show_background_info boolean not null default true,
  show_character_info boolean not null default true,
  allow_free_input boolean not null default true,
  allow_ai_scene_progress boolean not null default true,
  difficulty text not null default 'normal' check (difficulty in ('easy', 'normal', 'hard', 'extreme')),
  pacing text not null default 'natural' check (pacing in ('fast', 'natural', 'slow')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.intro_settings (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null unique references public.scenarios(id) on delete cascade,
  start_text text not null default '',
  start_location text not null default '',
  start_situation text not null default '',
  appearing_character_ids uuid[] not null default '{}',
  user_profile_id uuid references public.user_profiles(id) on delete set null,
  initial_narration text not null default '',
  initial_character_messages jsonb not null default '[]'::jsonb,
  initial_choices jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.play_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  user_profile_id uuid references public.user_profiles(id) on delete set null,
  current_scene_key text not null default 'chapter_1_opening',
  chapter_index integer not null default 1,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  last_summary text not null default '',
  nsfw_chat_enabled boolean not null default false,
  nsfw_image_enabled boolean not null default false,
  pending_choices jsonb not null default '[]'::jsonb,
  story_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.play_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  message_type text not null check (message_type in ('narration', 'character', 'user', 'system', 'event', 'image', 'choice')),
  speaker_type text not null check (speaker_type in ('user', 'character', 'narrator', 'system')),
  speaker_id uuid,
  speaker_name text,
  speaker_avatar_url text,
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete cascade,
  character_id uuid references public.scenario_characters(id) on delete set null,
  session_id uuid references public.play_sessions(id) on delete cascade,
  type text not null check (type in ('user_memory', 'character_memory', 'relationship_memory', 'story_memory', 'promise', 'preference', 'sensitive', 'explicit')),
  content text not null,
  importance integer not null default 3 check (importance between 1 and 5),
  sensitivity text not null default 'normal' check (sensitivity in ('normal', 'sensitive', 'explicit')),
  include_in_prompt boolean not null default true,
  source_message_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memory_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete cascade,
  character_id uuid references public.scenario_characters(id) on delete set null,
  session_id uuid references public.play_sessions(id) on delete cascade,
  source_message_id uuid references public.messages(id) on delete set null,
  type text not null check (type in ('user_memory', 'character_memory', 'relationship_memory', 'story_memory', 'promise', 'preference', 'sensitive', 'explicit')),
  content text not null,
  importance integer not null default 3 check (importance between 1 and 5),
  sensitivity text not null default 'normal' check (sensitivity in ('normal', 'sensitive', 'explicit')),
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.relationship_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  character_id uuid not null references public.scenario_characters(id) on delete cascade,
  trust integer not null default 0,
  affection integer not null default 0,
  comfort integer not null default 0,
  curiosity integer not null default 0,
  tension integer not null default 0,
  relationship_label text not null default '初対面',
  updated_at timestamptz not null default now(),
  unique (user_id, scenario_id, character_id)
);

create table public.story_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  session_id uuid references public.play_sessions(id) on delete cascade,
  key text not null,
  value jsonb not null default 'true'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, key)
);

create table public.story_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  session_id uuid not null references public.play_sessions(id) on delete cascade,
  chapter_index integer not null default 1,
  summary text not null,
  created_at timestamptz not null default now()
);

create table public.image_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid not null references public.play_sessions(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  prompt text not null,
  backend text not null,
  nsfw_enabled boolean not null default false,
  trigger_type text not null check (trigger_type in ('manual', 'major_event', 'chapter_start')),
  status text not null default 'queued' check (status in ('queued', 'generating', 'completed', 'failed')),
  estimated_cost_jpy numeric(10, 2) not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.generated_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid not null references public.play_sessions(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  job_id uuid references public.image_generation_jobs(id) on delete set null,
  storage_path text,
  public_url text,
  thumbnail_url text,
  is_nsfw boolean not null default false,
  blur_by_default boolean not null default false,
  prompt_summary text not null default '',
  created_at timestamptz not null default now()
);

create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('conversation', 'image')),
  backend text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_jpy numeric(10, 2) not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  adult_confirmed boolean not null default false,
  nsfw_chat_enabled boolean not null default false,
  nsfw_image_enabled boolean not null default false,
  blur_nsfw_images boolean not null default true,
  hide_sensitive_memories boolean not null default true,
  show_nsfw_in_history boolean not null default false,
  startup_age_gate boolean not null default true,
  monthly_budget_jpy integer not null default 3000,
  conversation_budget_jpy integer not null default 2000,
  image_budget_jpy integer not null default 1000,
  low_cost_mode boolean not null default true,
  choice_send_behavior text not null default 'send_immediately' check (choice_send_behavior in ('send_immediately', 'insert_into_composer')),
  normal_conversation_backend text not null default 'mock-normal',
  nsfw_conversation_backend text not null default 'mock-nsfw',
  standard_image_backend text not null default 'mock-standard-image',
  nsfw_image_backend text not null default 'mock-private-nsfw-image',
  image_generation_enabled boolean not null default true,
  suggest_images_on_major_events boolean not null default true,
  allow_manual_image_generation boolean not null default true,
  image_quality text not null default 'standard',
  image_size text not null default 'square',
  daily_image_limit integer not null default 5,
  monthly_image_limit integer not null default 60,
  updated_at timestamptz not null default now()
);

create table public.forbidden_content_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  key text not null,
  label text not null,
  description text not null default '',
  applies_to text[] not null default '{conversation,image}',
  severity text not null default 'blocked' check (severity in ('blocked', 'warn')),
  enabled boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create index scenarios_user_id_idx on public.scenarios(user_id);
create index scenario_characters_scenario_id_idx on public.scenario_characters(scenario_id);
create index user_profiles_user_id_idx on public.user_profiles(user_id);
create index user_profiles_scenario_id_idx on public.user_profiles(scenario_id);
create index lorebook_entries_scenario_id_idx on public.lorebook_entries(scenario_id);
create index play_sessions_user_id_idx on public.play_sessions(user_id);
create index play_sessions_scenario_id_idx on public.play_sessions(scenario_id);
create index messages_session_id_created_at_idx on public.messages(session_id, created_at);
create index memories_user_id_idx on public.memories(user_id);
create index memories_scenario_id_idx on public.memories(scenario_id);
create index memory_candidates_user_id_idx on public.memory_candidates(user_id);
create index relationship_states_user_scenario_idx on public.relationship_states(user_id, scenario_id);
create index story_flags_session_id_idx on public.story_flags(session_id);
create index generated_images_user_id_idx on public.generated_images(user_id);
create index usage_logs_user_kind_created_at_idx on public.usage_logs(user_id, kind, created_at);

create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger scenarios_set_updated_at before update on public.scenarios
  for each row execute function public.set_updated_at();
create trigger scenario_characters_set_updated_at before update on public.scenario_characters
  for each row execute function public.set_updated_at();
create trigger user_profiles_set_updated_at before update on public.user_profiles
  for each row execute function public.set_updated_at();
create trigger lorebook_entries_set_updated_at before update on public.lorebook_entries
  for each row execute function public.set_updated_at();
create trigger style_settings_set_updated_at before update on public.style_settings
  for each row execute function public.set_updated_at();
create trigger intro_settings_set_updated_at before update on public.intro_settings
  for each row execute function public.set_updated_at();
create trigger play_sessions_set_updated_at before update on public.play_sessions
  for each row execute function public.set_updated_at();
create trigger memories_set_updated_at before update on public.memories
  for each row execute function public.set_updated_at();
create trigger memory_candidates_set_updated_at before update on public.memory_candidates
  for each row execute function public.set_updated_at();
create trigger story_flags_set_updated_at before update on public.story_flags
  for each row execute function public.set_updated_at();
create trigger image_generation_jobs_set_updated_at before update on public.image_generation_jobs
  for each row execute function public.set_updated_at();
create trigger app_settings_set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();
create trigger forbidden_content_rules_set_updated_at before update on public.forbidden_content_rules
  for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.scenarios enable row level security;
alter table public.scenario_characters enable row level security;
alter table public.user_profiles enable row level security;
alter table public.lorebook_entries enable row level security;
alter table public.style_settings enable row level security;
alter table public.intro_settings enable row level security;
alter table public.play_sessions enable row level security;
alter table public.messages enable row level security;
alter table public.memories enable row level security;
alter table public.memory_candidates enable row level security;
alter table public.relationship_states enable row level security;
alter table public.story_flags enable row level security;
alter table public.story_summaries enable row level security;
alter table public.image_generation_jobs enable row level security;
alter table public.generated_images enable row level security;
alter table public.usage_logs enable row level security;
alter table public.app_settings enable row level security;
alter table public.forbidden_content_rules enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.users,
  public.scenarios,
  public.scenario_characters,
  public.user_profiles,
  public.lorebook_entries,
  public.style_settings,
  public.intro_settings,
  public.play_sessions,
  public.messages,
  public.memories,
  public.memory_candidates,
  public.relationship_states,
  public.story_flags,
  public.story_summaries,
  public.image_generation_jobs,
  public.generated_images,
  public.usage_logs,
  public.app_settings,
  public.forbidden_content_rules
to authenticated;

create policy "Users can view their own profile row"
  on public.users for select to authenticated
  using ((select auth.uid()) = id);
create policy "Users can insert their own profile row"
  on public.users for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Users can update their own profile row"
  on public.users for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can read owned scenarios"
  on public.scenarios for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert owned scenarios"
  on public.scenarios for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update owned scenarios"
  on public.scenarios for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete owned scenarios"
  on public.scenarios for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read characters in owned scenarios"
  on public.scenario_characters for select to authenticated
  using (exists (
    select 1 from public.scenarios s
    where s.id = scenario_id and s.user_id = (select auth.uid())
  ));
create policy "Users can insert characters in owned scenarios"
  on public.scenario_characters for insert to authenticated
  with check (exists (
    select 1 from public.scenarios s
    where s.id = scenario_id and s.user_id = (select auth.uid())
  ));
create policy "Users can update characters in owned scenarios"
  on public.scenario_characters for update to authenticated
  using (exists (
    select 1 from public.scenarios s
    where s.id = scenario_id and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.scenarios s
    where s.id = scenario_id and s.user_id = (select auth.uid())
  ));
create policy "Users can delete characters in owned scenarios"
  on public.scenario_characters for delete to authenticated
  using (exists (
    select 1 from public.scenarios s
    where s.id = scenario_id and s.user_id = (select auth.uid())
  ));

create policy "Users can read owned user profiles"
  on public.user_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert owned user profiles"
  on public.user_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update owned user profiles"
  on public.user_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete owned user profiles"
  on public.user_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read lore in owned scenarios"
  on public.lorebook_entries for select to authenticated
  using (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));
create policy "Users can insert lore in owned scenarios"
  on public.lorebook_entries for insert to authenticated
  with check (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));
create policy "Users can update lore in owned scenarios"
  on public.lorebook_entries for update to authenticated
  using (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));
create policy "Users can delete lore in owned scenarios"
  on public.lorebook_entries for delete to authenticated
  using (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));

create policy "Users can read style for owned scenarios"
  on public.style_settings for select to authenticated
  using (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));
create policy "Users can insert style for owned scenarios"
  on public.style_settings for insert to authenticated
  with check (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));
create policy "Users can update style for owned scenarios"
  on public.style_settings for update to authenticated
  using (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));
create policy "Users can delete style for owned scenarios"
  on public.style_settings for delete to authenticated
  using (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));

create policy "Users can read intro for owned scenarios"
  on public.intro_settings for select to authenticated
  using (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));
create policy "Users can insert intro for owned scenarios"
  on public.intro_settings for insert to authenticated
  with check (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));
create policy "Users can update intro for owned scenarios"
  on public.intro_settings for update to authenticated
  using (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));
create policy "Users can delete intro for owned scenarios"
  on public.intro_settings for delete to authenticated
  using (exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = (select auth.uid())));

create policy "Users can read owned play sessions"
  on public.play_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert owned play sessions"
  on public.play_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update owned play sessions"
  on public.play_sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete owned play sessions"
  on public.play_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read messages in owned sessions"
  on public.messages for select to authenticated
  using (exists (select 1 from public.play_sessions ps where ps.id = session_id and ps.user_id = (select auth.uid())));
create policy "Users can insert messages in owned sessions"
  on public.messages for insert to authenticated
  with check (exists (select 1 from public.play_sessions ps where ps.id = session_id and ps.user_id = (select auth.uid())));
create policy "Users can update messages in owned sessions"
  on public.messages for update to authenticated
  using (exists (select 1 from public.play_sessions ps where ps.id = session_id and ps.user_id = (select auth.uid())))
  with check (exists (select 1 from public.play_sessions ps where ps.id = session_id and ps.user_id = (select auth.uid())));
create policy "Users can delete messages in owned sessions"
  on public.messages for delete to authenticated
  using (exists (select 1 from public.play_sessions ps where ps.id = session_id and ps.user_id = (select auth.uid())));

create policy "Users can manage owned memories"
  on public.memories for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can manage owned memory candidates"
  on public.memory_candidates for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can manage owned relationship states"
  on public.relationship_states for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can manage owned story flags"
  on public.story_flags for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can manage owned story summaries"
  on public.story_summaries for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can manage owned image jobs"
  on public.image_generation_jobs for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can manage owned generated images"
  on public.generated_images for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can read owned usage logs"
  on public.usage_logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert owned usage logs"
  on public.usage_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can manage owned app settings"
  on public.app_settings for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read system and owned forbidden rules"
  on public.forbidden_content_rules for select to authenticated
  using (is_system or user_id = (select auth.uid()));
create policy "Users can insert owned forbidden rules"
  on public.forbidden_content_rules for insert to authenticated
  with check (user_id = (select auth.uid()) and not is_system);
create policy "Users can update owned forbidden rules"
  on public.forbidden_content_rules for update to authenticated
  using (user_id = (select auth.uid()) and not is_system)
  with check (user_id = (select auth.uid()) and not is_system);
create policy "Users can delete owned forbidden rules"
  on public.forbidden_content_rules for delete to authenticated
  using (user_id = (select auth.uid()) and not is_system);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('generated-images', 'generated-images', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read owned avatar objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and owner = (select auth.uid()));
create policy "Users can insert owned avatar objects"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and owner = (select auth.uid()));
create policy "Users can update owned avatar objects"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner = (select auth.uid()))
  with check (bucket_id = 'avatars' and owner = (select auth.uid()));
create policy "Users can delete owned avatar objects"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and owner = (select auth.uid()));

create policy "Users can read owned generated image objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'generated-images' and owner = (select auth.uid()));
create policy "Users can insert owned generated image objects"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'generated-images' and owner = (select auth.uid()));
create policy "Users can update owned generated image objects"
  on storage.objects for update to authenticated
  using (bucket_id = 'generated-images' and owner = (select auth.uid()))
  with check (bucket_id = 'generated-images' and owner = (select auth.uid()));
create policy "Users can delete owned generated image objects"
  on storage.objects for delete to authenticated
  using (bucket_id = 'generated-images' and owner = (select auth.uid()));

insert into public.forbidden_content_rules
  (key, label, description, applies_to, severity, enabled, is_system)
values
  ('non_consent', '非合意・強制・脅迫・性的暴力', '合意のない性的行為、強制、脅迫、性的暴力を禁止する。', '{conversation,image}', 'blocked', true, true),
  ('incest', '近親相姦', '近親相姦を含む性的コンテンツを禁止する。', '{conversation,image}', 'blocked', true, true),
  ('real_person_deepfake', '実在人物の性的ディープフェイク', '実在人物を性的に描写または画像化するディープフェイクを禁止する。', '{conversation,image}', 'blocked', true, true),
  ('trafficking_exploitation_abuse', '人身売買・搾取・性的虐待', '人身売買、搾取、性的虐待を禁止する。', '{conversation,image}', 'blocked', true, true),
  ('bestiality', '動物との性的行為', '動物との性的行為を禁止する。', '{conversation,image}', 'blocked', true, true),
  ('illegal_content', '違法コンテンツ', '違法行為や違法コンテンツの生成を禁止する。', '{conversation,image}', 'blocked', true, true),
  ('non_consensual_intimate_images', '非同意の親密画像', 'リベンジポルノや非同意の親密画像を禁止する。', '{conversation,image}', 'blocked', true, true)
on conflict (user_id, key) do nothing;
