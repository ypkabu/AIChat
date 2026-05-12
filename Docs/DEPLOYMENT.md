# Deployment

## Goal

To play from a smartphone while the PC is shut down, deploy the app to a cloud host. The intended setup is:

- Vercel for the Next.js PWA
- Supabase for Auth, Database, and Storage
- OpenAI or another server-side conversation provider

## Required Environment Variables

Set these in the Vercel project settings:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
CONVERSATION_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Do not expose `OPENAI_API_KEY` with a `NEXT_PUBLIC_` prefix.

## Notes

- Service worker registration is production-only.
- Supabase RLS requires a logged-in Supabase user for remote DB and Storage writes.
- OpenAI quota/billing has been verified with the Responses API. If quota is exhausted later, the app still opens and conversation falls back with an error message.

## Current Production

- Vercel project: `ippo-s-projects/aichat-roleplay`
- Production URL: `https://aichat-roleplay.vercel.app`
- Production env vars are configured in Vercel for Supabase and OpenAI.
- `.vercelignore` excludes local `.env` files so secrets are not uploaded as source files.
