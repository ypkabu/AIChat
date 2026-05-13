alter table public.app_settings
  add column if not exists streaming_display_enabled boolean not null default true,
  add column if not exists typewriter_enabled boolean not null default true,
  add column if not exists typewriter_speed text not null default 'normal',
  add column if not exists real_streaming_enabled boolean not null default false,
  add column if not exists streaming_fallback_enabled boolean not null default true,
  add column if not exists show_skip_button boolean not null default true;

alter table public.app_settings
  drop constraint if exists app_settings_typewriter_speed_check,
  add constraint app_settings_typewriter_speed_check
    check (typewriter_speed in ('slow', 'normal', 'fast', 'instant'));

grant select, insert, update, delete on public.app_settings to authenticated;
