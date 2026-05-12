-- Add new model role columns to app_settings
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS director_provider          text NOT NULL DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS director_model             text NOT NULL DEFAULT 'gpt-4.1',
  ADD COLUMN IF NOT EXISTS smart_reply_provider       text NOT NULL DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS smart_reply_model          text NOT NULL DEFAULT 'gpt-4.1-mini',
  ADD COLUMN IF NOT EXISTS summary_provider           text NOT NULL DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS summary_model              text NOT NULL DEFAULT 'gpt-4.1-mini',
  ADD COLUMN IF NOT EXISTS image_prompt_provider      text NOT NULL DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS image_prompt_model         text NOT NULL DEFAULT 'gpt-4.1-mini',
  ADD COLUMN IF NOT EXISTS model_preset               text NOT NULL DEFAULT 'balanced';

-- Add model_role and reason_for_model_selection to usage_logs
ALTER TABLE usage_logs
  ADD COLUMN IF NOT EXISTS model_role                    text,
  ADD COLUMN IF NOT EXISTS reason_for_model_selection    text;

-- Grant access for authenticated users (2026-04-28 Data API change)
GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON usage_logs    TO authenticated;
