-- Scene Visual Bundle System migration
-- Adds: session_scene_visual_state, scene_visual_bundles, scene_visual_variants
-- Extends: generated_images, image_generation_jobs, app_settings

-- ── session_scene_visual_state ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_scene_visual_state (
  id                        text        PRIMARY KEY,
  session_id                text        NOT NULL REFERENCES public.play_sessions(id) ON DELETE CASCADE,
  current_background_image_id text      REFERENCES public.generated_images(id) ON DELETE SET NULL,
  location                  text        NOT NULL DEFAULT '',
  time_of_day               text        NOT NULL DEFAULT '',
  weather                   text        NOT NULL DEFAULT '',
  active_characters_json    jsonb       NOT NULL DEFAULT '[]',
  character_outfits_json    jsonb       NOT NULL DEFAULT '{}',
  character_emotions_json   jsonb       NOT NULL DEFAULT '{}',
  scene_mood                text        NOT NULL DEFAULT '',
  camera_distance           text        NOT NULL DEFAULT 'medium',
  pov_type                  text        NOT NULL DEFAULT 'first_person',
  last_prompt_summary       text        NOT NULL DEFAULT '',
  scene_key                 text        NOT NULL DEFAULT '',
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS session_scene_visual_state_session_id_idx
  ON public.session_scene_visual_state (session_id);

-- ── scene_visual_bundles ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scene_visual_bundles (
  id                  text        PRIMARY KEY,
  session_id          text        NOT NULL REFERENCES public.play_sessions(id) ON DELETE CASCADE,
  scenario_id         text        NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  scene_key           text        NOT NULL DEFAULT '',
  location            text        NOT NULL DEFAULT '',
  time_of_day         text        NOT NULL DEFAULT '',
  weather             text        NOT NULL DEFAULT '',
  active_character_ids jsonb      NOT NULL DEFAULT '[]',
  base_image_id       text        REFERENCES public.generated_images(id) ON DELETE SET NULL,
  continuity_group_id text,
  style_preset        text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scene_visual_bundles_session_scene_idx
  ON public.scene_visual_bundles (session_id, scene_key);

-- ── scene_visual_variants ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scene_visual_variants (
  id                text        PRIMARY KEY,
  bundle_id         text        NOT NULL REFERENCES public.scene_visual_bundles(id) ON DELETE CASCADE,
  image_id          text        REFERENCES public.generated_images(id) ON DELETE SET NULL,
  variant_type      text        NOT NULL DEFAULT 'base',
  expression        text,
  pose              text,
  emotion_tone      text,
  quality_preset    text        NOT NULL DEFAULT 'standard',
  generation_status text        NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scene_visual_variants_bundle_expr_idx
  ON public.scene_visual_variants (bundle_id, variant_type, expression);

-- ── Extend generated_images ─────────────────────────────────────────────────
ALTER TABLE public.generated_images
  ADD COLUMN IF NOT EXISTS image_kind          text    NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS scene_key           text,
  ADD COLUMN IF NOT EXISTS bundle_id           text,
  ADD COLUMN IF NOT EXISTS variant_type        text,
  ADD COLUMN IF NOT EXISTS expression          text,
  ADD COLUMN IF NOT EXISTS continuity_group_id text,
  ADD COLUMN IF NOT EXISTS quality_preset      text,
  ADD COLUMN IF NOT EXISTS style_preset        text,
  ADD COLUMN IF NOT EXISTS cost_estimated_jpy  numeric,
  ADD COLUMN IF NOT EXISTS latency_ms          integer;

-- ── Extend image_generation_jobs ────────────────────────────────────────────
ALTER TABLE public.image_generation_jobs
  ADD COLUMN IF NOT EXISTS image_kind              text  NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS scene_key               text,
  ADD COLUMN IF NOT EXISTS background_cue_json     jsonb,
  ADD COLUMN IF NOT EXISTS style_preset            text,
  ADD COLUMN IF NOT EXISTS reference_image_ids_json jsonb,
  ADD COLUMN IF NOT EXISTS prompt_summary          text,
  ADD COLUMN IF NOT EXISTS continuity_group_id     text;

-- ── Extend app_settings ─────────────────────────────────────────────────────
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS visual_mode                  text    NOT NULL DEFAULT 'scene_bundle',
  ADD COLUMN IF NOT EXISTS background_transition        text    NOT NULL DEFAULT 'fade',
  ADD COLUMN IF NOT EXISTS base_image_quality           text    NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS expression_variant_quality   text    NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS event_cg_quality             text    NOT NULL DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS expression_pregen_enabled    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_monthly_budget_jpy     integer NOT NULL DEFAULT 1400,
  ADD COLUMN IF NOT EXISTS base_image_budget_jpy        integer NOT NULL DEFAULT 800,
  ADD COLUMN IF NOT EXISTS expression_variant_budget_jpy integer NOT NULL DEFAULT 400,
  ADD COLUMN IF NOT EXISTS event_cg_budget_jpy          integer NOT NULL DEFAULT 200;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.session_scene_visual_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_visual_bundles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_visual_variants      ENABLE ROW LEVEL SECURITY;

-- session_scene_visual_state policies
CREATE POLICY "Users manage their visual state"
  ON public.session_scene_visual_state
  USING (
    session_id IN (
      SELECT id FROM public.play_sessions WHERE user_id::text = auth.uid()::text
    )
  );
CREATE POLICY "Users insert their visual state"
  ON public.session_scene_visual_state FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.play_sessions WHERE user_id::text = auth.uid()::text
    )
  );

-- scene_visual_bundles policies
CREATE POLICY "Users manage their visual bundles"
  ON public.scene_visual_bundles
  USING (
    session_id IN (
      SELECT id FROM public.play_sessions WHERE user_id::text = auth.uid()::text
    )
  );
CREATE POLICY "Users insert their visual bundles"
  ON public.scene_visual_bundles FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.play_sessions WHERE user_id::text = auth.uid()::text
    )
  );

-- scene_visual_variants policies
CREATE POLICY "Users manage their visual variants"
  ON public.scene_visual_variants
  USING (
    bundle_id IN (
      SELECT svb.id FROM public.scene_visual_bundles svb
      JOIN public.play_sessions ps ON svb.session_id = ps.id
      WHERE ps.user_id::text = auth.uid()::text
    )
  );
CREATE POLICY "Users insert their visual variants"
  ON public.scene_visual_variants FOR INSERT
  WITH CHECK (
    bundle_id IN (
      SELECT svb.id FROM public.scene_visual_bundles svb
      JOIN public.play_sessions ps ON svb.session_id = ps.id
      WHERE ps.user_id::text = auth.uid()::text
    )
  );

-- ── GRANT ────────────────────────────────────────────────────────────────────
GRANT ALL ON public.session_scene_visual_state TO authenticated;
GRANT ALL ON public.scene_visual_bundles        TO authenticated;
GRANT ALL ON public.scene_visual_variants       TO authenticated;
