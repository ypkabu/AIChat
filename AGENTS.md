# Project Agent Instructions

## Context Source

- Treat repository Markdown files as the source of truth for project context.
- Do not rely on assistant memory or long conversation history when the same information is available in project docs.
- At the start of work, read the project docs under `Docs/` in the order defined by `Docs/PROMPT_GUIDE.md`.
- Do not read Markdown under `node_modules/`, `.next/`, or other generated dependency/build directories unless explicitly needed for a dependency issue.
- If a doc was already read in the current session and has not changed, do not read it again.
- If implementation decisions change, update the relevant docs before finishing.

## Default Doc Order

1. `Docs/AI_CONTEXT.md`
2. `Docs/AI_TASKS.md`
3. `Docs/BUGS.md` when handling bugs
4. `Docs/ARCHITECTURE.md` when changing design, DB, providers, or PWA architecture
5. `Docs/STORY_SYSTEM.md` when changing story progression, director, foreshadowing, or narrative quality logic
6. Tail of `Docs/AI_WORKLOG.md` only when recent decisions matter
