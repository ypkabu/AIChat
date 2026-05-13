-- Scenario detail page display metadata.
alter table public.scenarios
  add column if not exists cover_image_url text;
