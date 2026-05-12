-- Align entity IDs with the client-side app model.
-- The frontend uses stable string IDs (for example sample-rain-route and
-- scenario-<uuid>) so non-auth entity IDs must be text. Auth user IDs remain uuid.

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'users',
        'scenarios',
        'scenario_characters',
        'user_profiles',
        'lorebook_entries',
        'style_settings',
        'intro_settings',
        'play_sessions',
        'messages',
        'memories',
        'memory_candidates',
        'relationship_states',
        'story_flags',
        'story_summaries',
        'image_generation_jobs',
        'generated_images',
        'usage_logs',
        'app_settings',
        'forbidden_content_rules'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end;
$$;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where contype = 'f'
      and connamespace = 'public'::regnamespace
  loop
    execute format('alter table %s drop constraint if exists %I', constraint_record.table_name, constraint_record.conname);
  end loop;
end;
$$;

alter table public.scenarios alter column id drop default;
alter table public.scenario_characters alter column id drop default;
alter table public.user_profiles alter column id drop default;
alter table public.lorebook_entries alter column id drop default;
alter table public.style_settings alter column id drop default;
alter table public.intro_settings alter column id drop default;
alter table public.play_sessions alter column id drop default;
alter table public.messages alter column id drop default;
alter table public.memories alter column id drop default;
alter table public.memory_candidates alter column id drop default;
alter table public.relationship_states alter column id drop default;
alter table public.story_flags alter column id drop default;
alter table public.story_summaries alter column id drop default;
alter table public.image_generation_jobs alter column id drop default;
alter table public.generated_images alter column id drop default;
alter table public.usage_logs alter column id drop default;

alter table public.scenarios alter column id type text using id::text;

alter table public.scenario_characters
  alter column id type text using id::text,
  alter column scenario_id type text using scenario_id::text;

alter table public.user_profiles
  alter column id type text using id::text,
  alter column scenario_id type text using scenario_id::text;

alter table public.lorebook_entries
  alter column id type text using id::text,
  alter column scenario_id type text using scenario_id::text,
  alter column related_character_ids type text[] using related_character_ids::text[];

alter table public.style_settings
  alter column id type text using id::text,
  alter column scenario_id type text using scenario_id::text;

alter table public.intro_settings
  alter column id type text using id::text,
  alter column scenario_id type text using scenario_id::text,
  alter column appearing_character_ids type text[] using appearing_character_ids::text[],
  alter column user_profile_id type text using user_profile_id::text;

alter table public.play_sessions
  alter column id type text using id::text,
  alter column scenario_id type text using scenario_id::text,
  alter column user_profile_id type text using user_profile_id::text;

alter table public.messages
  alter column id type text using id::text,
  alter column session_id type text using session_id::text,
  alter column speaker_id type text using speaker_id::text;

alter table public.memories
  alter column id type text using id::text,
  alter column scenario_id type text using scenario_id::text,
  alter column character_id type text using character_id::text,
  alter column session_id type text using session_id::text,
  alter column source_message_id type text using source_message_id::text;

alter table public.memory_candidates
  alter column id type text using id::text,
  alter column scenario_id type text using scenario_id::text,
  alter column character_id type text using character_id::text,
  alter column session_id type text using session_id::text,
  alter column source_message_id type text using source_message_id::text;

alter table public.relationship_states
  alter column id type text using id::text,
  alter column scenario_id type text using scenario_id::text,
  alter column character_id type text using character_id::text;

alter table public.story_flags
  alter column id type text using id::text,
  alter column scenario_id type text using scenario_id::text,
  alter column session_id type text using session_id::text;

alter table public.story_summaries
  alter column id type text using id::text,
  alter column scenario_id type text using scenario_id::text,
  alter column session_id type text using session_id::text;

alter table public.image_generation_jobs
  alter column id type text using id::text,
  alter column session_id type text using session_id::text,
  alter column scenario_id type text using scenario_id::text;

alter table public.generated_images
  alter column id type text using id::text,
  alter column session_id type text using session_id::text,
  alter column scenario_id type text using scenario_id::text,
  alter column job_id type text using job_id::text;

alter table public.usage_logs alter column id type text using id::text;

alter table public.scenarios alter column id set default gen_random_uuid()::text;
alter table public.scenario_characters alter column id set default gen_random_uuid()::text;
alter table public.user_profiles alter column id set default gen_random_uuid()::text;
alter table public.lorebook_entries alter column id set default gen_random_uuid()::text;
alter table public.style_settings alter column id set default gen_random_uuid()::text;
alter table public.intro_settings alter column id set default gen_random_uuid()::text;
alter table public.play_sessions alter column id set default gen_random_uuid()::text;
alter table public.messages alter column id set default gen_random_uuid()::text;
alter table public.memories alter column id set default gen_random_uuid()::text;
alter table public.memory_candidates alter column id set default gen_random_uuid()::text;
alter table public.relationship_states alter column id set default gen_random_uuid()::text;
alter table public.story_flags alter column id set default gen_random_uuid()::text;
alter table public.story_summaries alter column id set default gen_random_uuid()::text;
alter table public.image_generation_jobs alter column id set default gen_random_uuid()::text;
alter table public.generated_images alter column id set default gen_random_uuid()::text;
alter table public.usage_logs alter column id set default gen_random_uuid()::text;

alter table public.scenarios
  add constraint scenarios_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;

alter table public.users
  add constraint users_id_fkey foreign key (id) references auth.users(id) on delete cascade;

alter table public.scenario_characters
  add constraint scenario_characters_scenario_id_fkey foreign key (scenario_id) references public.scenarios(id) on delete cascade;

alter table public.user_profiles
  add constraint user_profiles_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade,
  add constraint user_profiles_scenario_id_fkey foreign key (scenario_id) references public.scenarios(id) on delete cascade;

alter table public.lorebook_entries
  add constraint lorebook_entries_scenario_id_fkey foreign key (scenario_id) references public.scenarios(id) on delete cascade;

alter table public.style_settings
  add constraint style_settings_scenario_id_fkey foreign key (scenario_id) references public.scenarios(id) on delete cascade;

alter table public.intro_settings
  add constraint intro_settings_scenario_id_fkey foreign key (scenario_id) references public.scenarios(id) on delete cascade,
  add constraint intro_settings_user_profile_id_fkey foreign key (user_profile_id) references public.user_profiles(id) on delete set null;

alter table public.play_sessions
  add constraint play_sessions_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade,
  add constraint play_sessions_scenario_id_fkey foreign key (scenario_id) references public.scenarios(id) on delete cascade,
  add constraint play_sessions_user_profile_id_fkey foreign key (user_profile_id) references public.user_profiles(id) on delete set null;

alter table public.messages
  add constraint messages_session_id_fkey foreign key (session_id) references public.play_sessions(id) on delete cascade;

alter table public.memories
  add constraint memories_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade,
  add constraint memories_scenario_id_fkey foreign key (scenario_id) references public.scenarios(id) on delete cascade,
  add constraint memories_character_id_fkey foreign key (character_id) references public.scenario_characters(id) on delete set null,
  add constraint memories_session_id_fkey foreign key (session_id) references public.play_sessions(id) on delete cascade,
  add constraint memories_source_message_id_fkey foreign key (source_message_id) references public.messages(id) on delete set null;

alter table public.memory_candidates
  add constraint memory_candidates_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade,
  add constraint memory_candidates_scenario_id_fkey foreign key (scenario_id) references public.scenarios(id) on delete cascade,
  add constraint memory_candidates_character_id_fkey foreign key (character_id) references public.scenario_characters(id) on delete set null,
  add constraint memory_candidates_session_id_fkey foreign key (session_id) references public.play_sessions(id) on delete cascade,
  add constraint memory_candidates_source_message_id_fkey foreign key (source_message_id) references public.messages(id) on delete set null;

alter table public.relationship_states
  add constraint relationship_states_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade,
  add constraint relationship_states_scenario_id_fkey foreign key (scenario_id) references public.scenarios(id) on delete cascade,
  add constraint relationship_states_character_id_fkey foreign key (character_id) references public.scenario_characters(id) on delete cascade;

alter table public.story_flags
  add constraint story_flags_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade,
  add constraint story_flags_scenario_id_fkey foreign key (scenario_id) references public.scenarios(id) on delete cascade,
  add constraint story_flags_session_id_fkey foreign key (session_id) references public.play_sessions(id) on delete cascade;

alter table public.story_summaries
  add constraint story_summaries_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade,
  add constraint story_summaries_scenario_id_fkey foreign key (scenario_id) references public.scenarios(id) on delete cascade,
  add constraint story_summaries_session_id_fkey foreign key (session_id) references public.play_sessions(id) on delete cascade;

alter table public.image_generation_jobs
  add constraint image_generation_jobs_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade,
  add constraint image_generation_jobs_session_id_fkey foreign key (session_id) references public.play_sessions(id) on delete cascade,
  add constraint image_generation_jobs_scenario_id_fkey foreign key (scenario_id) references public.scenarios(id) on delete cascade;

alter table public.generated_images
  add constraint generated_images_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade,
  add constraint generated_images_session_id_fkey foreign key (session_id) references public.play_sessions(id) on delete cascade,
  add constraint generated_images_scenario_id_fkey foreign key (scenario_id) references public.scenarios(id) on delete cascade,
  add constraint generated_images_job_id_fkey foreign key (job_id) references public.image_generation_jobs(id) on delete set null;

alter table public.usage_logs
  add constraint usage_logs_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;

alter table public.app_settings
  add constraint app_settings_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;

alter table public.forbidden_content_rules
  add constraint forbidden_content_rules_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;

create policy users_own_all on public.users
  for all
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy scenarios_own_all on public.scenarios
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy characters_by_owned_scenario on public.scenario_characters
  for all
  using (exists (
    select 1 from public.scenarios s
    where s.id = scenario_characters.scenario_id
      and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.scenarios s
    where s.id = scenario_characters.scenario_id
      and s.user_id = (select auth.uid())
  ));

create policy user_profiles_own_all on public.user_profiles
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy lore_by_owned_scenario on public.lorebook_entries
  for all
  using (exists (
    select 1 from public.scenarios s
    where s.id = lorebook_entries.scenario_id
      and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.scenarios s
    where s.id = lorebook_entries.scenario_id
      and s.user_id = (select auth.uid())
  ));

create policy style_by_owned_scenario on public.style_settings
  for all
  using (exists (
    select 1 from public.scenarios s
    where s.id = style_settings.scenario_id
      and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.scenarios s
    where s.id = style_settings.scenario_id
      and s.user_id = (select auth.uid())
  ));

create policy intro_by_owned_scenario on public.intro_settings
  for all
  using (exists (
    select 1 from public.scenarios s
    where s.id = intro_settings.scenario_id
      and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.scenarios s
    where s.id = intro_settings.scenario_id
      and s.user_id = (select auth.uid())
  ));

create policy play_sessions_own_all on public.play_sessions
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy messages_by_owned_session on public.messages
  for all
  using (exists (
    select 1 from public.play_sessions ps
    where ps.id = messages.session_id
      and ps.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.play_sessions ps
    where ps.id = messages.session_id
      and ps.user_id = (select auth.uid())
  ));

create policy memories_own_all on public.memories
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy memory_candidates_own_all on public.memory_candidates
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy relationship_states_own_all on public.relationship_states
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy story_flags_own_all on public.story_flags
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy story_summaries_own_all on public.story_summaries
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy image_generation_jobs_own_all on public.image_generation_jobs
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy generated_images_own_all on public.generated_images
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy usage_logs_read on public.usage_logs
  for select
  using ((select auth.uid()) = user_id);

create policy usage_logs_insert on public.usage_logs
  for insert
  with check ((select auth.uid()) = user_id);

create policy app_settings_own_all on public.app_settings
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy forbidden_rules_read on public.forbidden_content_rules
  for select
  using (is_system or user_id = (select auth.uid()));

create policy forbidden_rules_own_insert on public.forbidden_content_rules
  for insert
  with check (user_id = (select auth.uid()) and not is_system);

create policy forbidden_rules_own_update on public.forbidden_content_rules
  for update
  using (user_id = (select auth.uid()) and not is_system)
  with check (user_id = (select auth.uid()) and not is_system);

create policy forbidden_rules_own_delete on public.forbidden_content_rules
  for delete
  using (user_id = (select auth.uid()) and not is_system);
