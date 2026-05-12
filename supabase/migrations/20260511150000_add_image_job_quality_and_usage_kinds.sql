-- ============================================================
-- Extend image_generation_jobs with quality / style / params
-- ============================================================
ALTER TABLE public.image_generation_jobs
  ADD COLUMN IF NOT EXISTS quality_preset   text,
  ADD COLUMN IF NOT EXISTS style_preset     text,
  ADD COLUMN IF NOT EXISTS negative_prompt  text,
  ADD COLUMN IF NOT EXISTS width            integer,
  ADD COLUMN IF NOT EXISTS height           integer,
  ADD COLUMN IF NOT EXISTS steps            integer,
  ADD COLUMN IF NOT EXISTS cfg_scale        real,
  ADD COLUMN IF NOT EXISTS sampler          text,
  ADD COLUMN IF NOT EXISTS model_name       text,
  ADD COLUMN IF NOT EXISTS lora_json        jsonb,
  ADD COLUMN IF NOT EXISTS upscale_enabled  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed             bigint,
  ADD COLUMN IF NOT EXISTS latency_ms       integer;

-- ============================================================
-- Extend usage_logs: add output_chars, quality_preset
-- (kind column already has 'voice'; add new kinds via CHECK update)
-- ============================================================
ALTER TABLE public.usage_logs
  ADD COLUMN IF NOT EXISTS output_chars   integer,
  ADD COLUMN IF NOT EXISTS quality_preset text;

-- Relax the kind CHECK so smart_reply and summary are allowed
-- (PostgreSQL doesn't support ADD CONSTRAINT IF NOT EXISTS on CHECK,
--  so we drop the old one if it exists and re-add it)
ALTER TABLE public.usage_logs
  DROP CONSTRAINT IF EXISTS usage_logs_kind_check;

ALTER TABLE public.usage_logs
  ADD CONSTRAINT usage_logs_kind_check
  CHECK (kind IN ('conversation','image','voice','smart_reply','summary'));
