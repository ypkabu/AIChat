alter table public.image_generation_jobs
  drop constraint if exists image_generation_jobs_trigger_type_check;

alter table public.image_generation_jobs
  add constraint image_generation_jobs_trigger_type_check
  check (trigger_type in ('manual', 'major_event', 'chapter_start', 'special_branch'));

create table if not exists public.gallery_items (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  session_id text not null references public.play_sessions(id) on delete cascade,
  scenario_id text not null references public.scenarios(id) on delete cascade,
  image_id text references public.generated_images(id) on delete cascade,
  job_id text references public.image_generation_jobs(id) on delete set null,
  storage_path text,
  public_url text,
  thumbnail_url text,
  is_nsfw boolean not null default false,
  blur_by_default boolean not null default false,
  prompt_summary text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists gallery_items_user_id_idx on public.gallery_items(user_id);
create index if not exists gallery_items_session_id_idx on public.gallery_items(session_id);
create index if not exists gallery_items_scenario_id_idx on public.gallery_items(scenario_id);
create index if not exists gallery_items_image_id_idx on public.gallery_items(image_id);
create index if not exists gallery_items_job_id_idx on public.gallery_items(job_id);

alter table public.gallery_items enable row level security;

create policy gallery_items_own_all on public.gallery_items
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.gallery_items to authenticated;

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
where id = 'generated-images';
