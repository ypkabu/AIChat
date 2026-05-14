-- lorebook_entries.scenario_id を nullable に変更
-- スタンドアロン lorebook のエントリーは scenario に属さないため
alter table public.lorebook_entries
  alter column scenario_id drop not null;

-- lorebook_id を持つエントリーの RLS 対応
-- 既存 RLS は scenario_id 経由のみだが、lorebook_id 経由でもアクセスできるようにする
drop policy if exists "Users can read lore in owned scenarios" on public.lorebook_entries;
drop policy if exists "Users can read lore entries" on public.lorebook_entries;
create policy "Users can read lore entries"
  on public.lorebook_entries for select to authenticated
  using (
    exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = auth.uid())
    or exists (select 1 from public.lorebooks lb where lb.id = lorebook_id and lb.user_id = auth.uid())
  );

drop policy if exists "Users can insert lore in owned scenarios" on public.lorebook_entries;
drop policy if exists "Users can insert lore entries" on public.lorebook_entries;
create policy "Users can insert lore entries"
  on public.lorebook_entries for insert to authenticated
  with check (
    exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = auth.uid())
    or exists (select 1 from public.lorebooks lb where lb.id = lorebook_id and lb.user_id = auth.uid())
  );

drop policy if exists "Users can update lore in owned scenarios" on public.lorebook_entries;
drop policy if exists "Users can update lore entries" on public.lorebook_entries;
create policy "Users can update lore entries"
  on public.lorebook_entries for update to authenticated
  using (
    exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = auth.uid())
    or exists (select 1 from public.lorebooks lb where lb.id = lorebook_id and lb.user_id = auth.uid())
  );

drop policy if exists "Users can delete lore in owned scenarios" on public.lorebook_entries;
drop policy if exists "Users can delete lore entries" on public.lorebook_entries;
create policy "Users can delete lore entries"
  on public.lorebook_entries for delete to authenticated
  using (
    exists (select 1 from public.scenarios s where s.id = scenario_id and s.user_id = auth.uid())
    or exists (select 1 from public.lorebooks lb where lb.id = lorebook_id and lb.user_id = auth.uid())
  );
