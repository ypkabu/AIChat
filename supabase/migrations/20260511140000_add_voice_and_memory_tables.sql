-- ============================================================
-- Extend scenario_characters with full voice settings
-- ============================================================
ALTER TABLE public.scenario_characters
  ADD COLUMN IF NOT EXISTS voice_enabled      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS voice_style        text,
  ADD COLUMN IF NOT EXISTS voice_emotion      text,
  ADD COLUMN IF NOT EXISTS auto_play_voice    boolean NOT NULL DEFAULT false;

-- ============================================================
-- Extend voice_generation_jobs with storage / latency fields
-- ============================================================
ALTER TABLE public.voice_generation_jobs
  ADD COLUMN IF NOT EXISTS storage_path       text,
  ADD COLUMN IF NOT EXISTS public_url         text,
  ADD COLUMN IF NOT EXISTS latency_ms         integer,
  ADD COLUMN IF NOT EXISTS emotion            text;

-- ============================================================
-- generated_audio: persisted audio cache
-- ============================================================
CREATE TABLE IF NOT EXISTS public.generated_audio (
  id              text        PRIMARY KEY,
  user_id         text        NOT NULL,
  session_id      text,
  message_id      text,
  character_id    text,
  storage_path    text,
  public_url      text,
  audio_data_uri  text,
  provider        text        NOT NULL DEFAULT 'mock',
  model           text,
  voice_id        text,
  duration_ms     integer,
  is_nsfw         boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_audio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generated_audio: user CRUD"
  ON public.generated_audio
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.generated_audio TO authenticated;

CREATE INDEX IF NOT EXISTS generated_audio_session_idx
  ON public.generated_audio (session_id);
CREATE INDEX IF NOT EXISTS generated_audio_message_idx
  ON public.generated_audio (message_id);

-- ============================================================
-- memory_usage_logs: track which memories were used in prompts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.memory_usage_logs (
  id          text        PRIMARY KEY,
  user_id     text        NOT NULL,
  session_id  text        NOT NULL,
  memory_id   text        NOT NULL,
  reason      text,
  used_in_prompt boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memory_usage_logs: user CRUD"
  ON public.memory_usage_logs
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.memory_usage_logs TO authenticated;

CREATE INDEX IF NOT EXISTS memory_usage_logs_session_idx
  ON public.memory_usage_logs (session_id);

-- ============================================================
-- Extend app_settings with voice budget
-- ============================================================
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS voice_budget_jpy       real NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS voice_narration_enabled boolean NOT NULL DEFAULT false;
