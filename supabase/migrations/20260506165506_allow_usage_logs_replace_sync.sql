create policy usage_logs_delete on public.usage_logs
  for delete
  using ((select auth.uid()) = user_id);
