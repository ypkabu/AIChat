-- Voice provider settings per character
ALTER TABLE public.scenario_characters
  ADD COLUMN IF NOT EXISTS voice_provider text,
  ADD COLUMN IF NOT EXISTS voice_id       text,
  ADD COLUMN IF NOT EXISTS voice_model    text,
  ADD COLUMN IF NOT EXISTS voice_speed    real,
  ADD COLUMN IF NOT EXISTS voice_pitch    real;

-- Voice generation jobs (ephemeral; primarily tracked in client state)
CREATE TABLE IF NOT EXISTS public.voice_generation_jobs (
  id               text        PRIMARY KEY,
  user_id          text        NOT NULL,
  session_id       text        NOT NULL,
  message_id       text        NOT NULL,
  character_id     text,
  text             text        NOT NULL,
  voice_provider   text        NOT NULL DEFAULT 'mock',
  voice_id         text,
  voice_model      text,
  status           text        NOT NULL DEFAULT 'queued'
                               CHECK (status IN ('queued','generating','completed','failed')),
  duration_ms      integer,
  estimated_cost_jpy real      NOT NULL DEFAULT 0,
  error            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_generation_jobs_session_idx
  ON public.voice_generation_jobs (session_id);
