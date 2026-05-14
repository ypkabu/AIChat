alter table public.app_settings
  alter column real_streaming_enabled set default true;

update public.app_settings
set real_streaming_enabled = true,
    streaming_display_enabled = true,
    typewriter_enabled = true,
    streaming_fallback_enabled = true,
    show_skip_button = true
where real_streaming_enabled = false;

grant select, insert, update, delete on public.app_settings to authenticated;
