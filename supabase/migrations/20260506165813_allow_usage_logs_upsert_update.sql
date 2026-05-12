create policy usage_logs_update on public.usage_logs
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
