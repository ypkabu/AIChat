create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists generated_images_job_id_idx on public.generated_images(job_id);
create index if not exists generated_images_scenario_id_idx on public.generated_images(scenario_id);
create index if not exists generated_images_session_id_idx on public.generated_images(session_id);

create index if not exists image_generation_jobs_user_id_idx on public.image_generation_jobs(user_id);
create index if not exists image_generation_jobs_session_id_idx on public.image_generation_jobs(session_id);
create index if not exists image_generation_jobs_scenario_id_idx on public.image_generation_jobs(scenario_id);

create index if not exists intro_settings_user_profile_id_idx on public.intro_settings(user_profile_id);

create index if not exists memories_character_id_idx on public.memories(character_id);
create index if not exists memories_session_id_idx on public.memories(session_id);
create index if not exists memories_source_message_id_idx on public.memories(source_message_id);

create index if not exists memory_candidates_character_id_idx on public.memory_candidates(character_id);
create index if not exists memory_candidates_scenario_id_idx on public.memory_candidates(scenario_id);
create index if not exists memory_candidates_session_id_idx on public.memory_candidates(session_id);
create index if not exists memory_candidates_source_message_id_idx on public.memory_candidates(source_message_id);

create index if not exists play_sessions_user_profile_id_idx on public.play_sessions(user_profile_id);

create index if not exists relationship_states_character_id_idx on public.relationship_states(character_id);
create index if not exists relationship_states_scenario_id_idx on public.relationship_states(scenario_id);

create index if not exists story_flags_user_id_idx on public.story_flags(user_id);
create index if not exists story_flags_scenario_id_idx on public.story_flags(scenario_id);

create index if not exists story_summaries_user_id_idx on public.story_summaries(user_id);
create index if not exists story_summaries_scenario_id_idx on public.story_summaries(scenario_id);
create index if not exists story_summaries_session_id_idx on public.story_summaries(session_id);
