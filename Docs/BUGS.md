# Bugs

## Open

- Supabase Auth leaked password protection remains a Dashboard-side setting. It is not controlled by DB migrations in this project.

## Fixed

- OpenAI API quota/billing is now active. Direct Responses API and local `/api/conversation` normal E2E both returned successful responses with token usage.
- Supabase Storage image upload attempted to run when Supabase was configured but the browser had no authenticated user. Generated images and avatars now fall back to local/data URL storage unless a matching Supabase user session exists.
- Chat bubbles, narration, system messages, event messages, and image captions can now wrap long text/URLs without horizontal overflow.
- The mobile composer now tracks `visualViewport` and moves above the on-screen keyboard where supported.
- Free-text turns could display AI-invented `{{user}}` dialogue when the model returned a user speaker item. The client now only allows AI-generated user bubbles for `choice_selected` turns and filters them from free-text/auto turns.
- Background foreshadowing analysis could request `reinforce` on a `planned` clue, producing an invalid `planned -> developing` warning. The client now treats that case as first introduction and the background prompt asks for `introduce` on planned clues.
