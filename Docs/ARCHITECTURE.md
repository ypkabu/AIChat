# Architecture

## Runtime Shape

- Next.js App Router serves the PWA UI and server-side API routes.
- Supabase provides Auth, Postgres, and Storage.
- localStorage is the fallback state store when Supabase is not configured or no user is logged in.
- Once logged in, remote state is loaded from Supabase and saved by upsert plus scoped deletion sync.
- Supabase browser auth uses persisted PKCE sessions with token auto-refresh, so the app should remain logged in after closing and reopening the browser/PWA unless the session is explicitly signed out or expires server-side.

## Conversation

- Client prefers `/api/story/{storyId}/chat/stream` for play turns and falls back to `/api/conversation` when streaming is unavailable.
- The stream route calls the OpenAI Responses API with `stream:true`, parses model output as one-JSON-per-line NDJSON, and emits app-level SSE events: `timeline_item`, `choices`, `director_update`, `usage`, `done`, or `error`.
- `/api/conversation` remains the non-stream compatibility route and is also used for fallback pseudo-stream display.
- The route selects a provider through `src/lib/ai/conversation/provider.ts`.
- `CONVERSATION_PROVIDER=openai` uses the OpenAI Responses API server-side.
- Per-use provider/model settings live in `app_settings`: normal, NSFW, cheap, and smart conversation routes. Selection order is NSFW, major event smart model, low-cost model, then normal model.
- Mock providers remain available for offline and low-cost MVP testing.
- AI output primary format is `timeline`; stream mode asks for NDJSON `narration` / `dialogue` / `choices` / `director` lines and the client converts each display item into chat messages as it arrives.
- Story Director data lives in `story_scenes` plus director fields on `play_sessions`. The prompt receives the current objective, beat, beat list, turn budget, conflict, hook, stall state, and pace mode.
- Foreshadowing data lives in `foreshadowing_items`. The app sends only relevant active items, capped to about five, and keeps `hidden_truth` out of normal play UI until reveal conditions are met.
- Narrative Quality Check is returned as `qualityCheck`, saved to `narrative_quality_logs`, and folded back into `stall_count` / next-turn improvement hints.
- `usage_logs` stores provider, model, token counts, estimated cost, and image count.
- Play UI disables input while a turn is active, shows a typing indicator, displays timeline items with short staged delays, exposes skip, and only reveals choices after the timeline has finished.

## Images

- Image generation is separated from conversation generation.
- Image provider/model settings live in `app_settings`: standard image and NSFW image routes.
- Allowed triggers are `manual`, `major_event`, `chapter_start`, and `special_branch`.
- Jobs use `queued`, `generating`, `completed`, and `failed`.
- If a Supabase authenticated user is available, generated images are stored in the private `generated-images` bucket and a signed URL is saved.
- If no authenticated user is available, generated images remain local and do not attempt Storage writes.

## Mobile PWA

- `public/manifest.webmanifest` defines standalone portrait PWA behavior.
- `public/sw.js` registers in production only.
- `src/app/globals.css` defines safe-area variables and `100dvh` viewport helpers.
- Chat composer uses `visualViewport` to reduce keyboard overlap on mobile browsers.

## Deployment

PC-off mobile play requires a hosted deployment, preferably Vercel plus Supabase. A local `npm run dev` server only works while the PC is awake and reachable.
