-- Additional voice columns added to scenario_characters after initial migration
ALTER TABLE public.scenario_characters
  ADD COLUMN IF NOT EXISTS voice_enabled   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_style     text,
  ADD COLUMN IF NOT EXISTS voice_emotion   text,
  ADD COLUMN IF NOT EXISTS auto_play_voice boolean DEFAULT false;

-- RLS for voice_generation_jobs
ALTER TABLE public.voice_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_generation_jobs: user CRUD"
  ON public.voice_generation_jobs FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.voice_generation_jobs TO authenticated;

-- Note: FK constraints for generated_audio and memory_usage_logs
-- are deferred until those tables are created in a later migration.
