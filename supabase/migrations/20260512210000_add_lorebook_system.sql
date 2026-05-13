-- ============================================================
-- Standalone Lorebook System
-- ============================================================

-- 1. lorebooks テーブル（ユーザーレベルの再利用可能なロアブック）
create table public.lorebooks (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '新しいロアブック',
  short_description text not null default '',
  cover_image_url text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lorebooks_user_id_idx on public.lorebooks(user_id);

create trigger lorebooks_set_updated_at
  before update on public.lorebooks
  for each row execute function public.set_updated_at();

alter table public.lorebooks enable row level security;

grant select, insert, update, delete on table public.lorebooks to authenticated;

create policy "lorebooks_select" on public.lorebooks
  for select to authenticated using (user_id = auth.uid());
create policy "lorebooks_insert" on public.lorebooks
  for insert to authenticated with check (user_id = auth.uid());
create policy "lorebooks_update" on public.lorebooks
  for update to authenticated using (user_id = auth.uid());
create policy "lorebooks_delete" on public.lorebooks
  for delete to authenticated using (user_id = auth.uid());

-- 2. lorebook_entries に新カラムを追加
alter table public.lorebook_entries
  add column if not exists lorebook_id text references public.lorebooks(id) on delete cascade,
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_truth text not null default '',
  add column if not exists entry_type text not null default 'other'
    check (entry_type in ('world','place','organization','character_secret','item','history','rule','foreshadowing','relationship','other'));

create index if not exists lorebook_entries_lorebook_id_idx on public.lorebook_entries(lorebook_id);

-- 3. plot_lorebook_links テーブル
create table public.plot_lorebook_links (
  id text primary key default gen_random_uuid()::text,
  plot_id text not null references public.scenarios(id) on delete cascade,
  lorebook_id text not null references public.lorebooks(id) on delete cascade,
  enabled boolean not null default true,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  unique (plot_id, lorebook_id)
);

create index plot_lorebook_links_plot_id_idx on public.plot_lorebook_links(plot_id);
create index plot_lorebook_links_lorebook_id_idx on public.plot_lorebook_links(lorebook_id);

alter table public.plot_lorebook_links enable row level security;

grant select, insert, update, delete on table public.plot_lorebook_links to authenticated;

-- RLS: シナリオのオーナーが操作できる（scenarios テーブル経由）
create policy "plot_lorebook_links_select" on public.plot_lorebook_links
  for select to authenticated
  using (exists (select 1 from public.scenarios s where s.id = plot_id and s.user_id = auth.uid()));
create policy "plot_lorebook_links_insert" on public.plot_lorebook_links
  for insert to authenticated
  with check (exists (select 1 from public.scenarios s where s.id = plot_id and s.user_id = auth.uid()));
create policy "plot_lorebook_links_update" on public.plot_lorebook_links
  for update to authenticated
  using (exists (select 1 from public.scenarios s where s.id = plot_id and s.user_id = auth.uid()));
create policy "plot_lorebook_links_delete" on public.plot_lorebook_links
  for delete to authenticated
  using (exists (select 1 from public.scenarios s where s.id = plot_id and s.user_id = auth.uid()));

-- 4. style_settings に新カラムを追加
alter table public.style_settings
  add column if not exists allow_continue_button boolean not null default true,
  add column if not exists mode_optimization text not null default 'none'
    check (mode_optimization in ('none', 'girlfriend', 'story'));
