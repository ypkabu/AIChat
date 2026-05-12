-- Add VRM/3D model fields to scenario_characters
ALTER TABLE scenario_characters
  ADD COLUMN IF NOT EXISTS model_type         text,
  ADD COLUMN IF NOT EXISTS model_storage_path text,
  ADD COLUMN IF NOT EXISTS model_url          text,
  ADD COLUMN IF NOT EXISTS default_expression text,
  ADD COLUMN IF NOT EXISTS default_motion     text,
  ADD COLUMN IF NOT EXISTS expression_map_json jsonb,
  ADD COLUMN IF NOT EXISTS motion_map_json    jsonb,
  ADD COLUMN IF NOT EXISTS vrm_scale          float8,
  ADD COLUMN IF NOT EXISTS vrm_position_json  jsonb,
  ADD COLUMN IF NOT EXISTS look_at_user_enabled boolean,
  ADD COLUMN IF NOT EXISTS blink_enabled      boolean,
  ADD COLUMN IF NOT EXISTS idle_motion_enabled boolean,
  ADD COLUMN IF NOT EXISTS license_note       text,
  ADD COLUMN IF NOT EXISTS app_use_allowed    boolean,
  ADD COLUMN IF NOT EXISTS modification_allowed boolean,
  ADD COLUMN IF NOT EXISTS nsfw_allowed       boolean,
  ADD COLUMN IF NOT EXISTS redistribution_allowed boolean;

-- Add VRM/experience-mode fields to app_settings
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS experience_mode    text    NOT NULL DEFAULT 'story',
  ADD COLUMN IF NOT EXISTS vrm_enabled        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vrm_quality        text    NOT NULL DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS vrm_fps_limit      int     NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS vrm_shadow_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vrm_physics_enabled boolean NOT NULL DEFAULT true;
