alter table public.style_settings
  add column if not exists play_pace_mode text not null default 'normal',
  add column if not exists auto_advance_message_count integer not null default 3,
  add column if not exists choice_frequency text not null default 'normal';

alter table public.play_sessions
  add column if not exists play_pace_mode text not null default 'normal',
  add column if not exists auto_continue_count integer not null default 0;

alter table public.style_settings
  drop constraint if exists style_settings_play_pace_mode_check,
  add constraint style_settings_play_pace_mode_check
    check (play_pace_mode in ('auto', 'normal', 'choice_heavy')),
  drop constraint if exists style_settings_auto_advance_message_count_check,
  add constraint style_settings_auto_advance_message_count_check
    check (auto_advance_message_count between 1 and 3),
  drop constraint if exists style_settings_choice_frequency_check,
  add constraint style_settings_choice_frequency_check
    check (choice_frequency in ('normal', 'high'));

alter table public.play_sessions
  drop constraint if exists play_sessions_play_pace_mode_check,
  add constraint play_sessions_play_pace_mode_check
    check (play_pace_mode in ('auto', 'normal', 'choice_heavy')),
  drop constraint if exists play_sessions_auto_continue_count_check,
  add constraint play_sessions_auto_continue_count_check
    check (auto_continue_count between 0 and 3);
