alter table public.intro_settings
  add column if not exists initial_timeline jsonb not null default '[]'::jsonb;

grant select, insert, update, delete on public.intro_settings to authenticated;
