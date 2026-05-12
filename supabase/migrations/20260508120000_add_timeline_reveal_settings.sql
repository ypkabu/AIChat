alter table public.app_settings
  add column if not exists timeline_reveal_enabled boolean not null default true,
  add column if not exists timeline_reveal_speed text not null default 'normal';

alter table public.app_settings
  drop constraint if exists app_settings_timeline_reveal_speed_check,
  add constraint app_settings_timeline_reveal_speed_check
    check (timeline_reveal_speed in ('slow', 'normal', 'fast', 'instant'));
