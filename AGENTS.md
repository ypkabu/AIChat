# Project Agent Instructions

## Context Source

- Treat repository Markdown files as the source of truth for project context.
- Treat Agentmemory as auxiliary memory only. Project Markdown remains the official record.
- Do not rely on assistant memory, Agentmemory, or long conversation history when the same information is available in project docs.
- At the start of work, read the project docs under `Docs/` in the order defined by `Docs/PROMPT_GUIDE.md`.
- After reading the required docs, search Agentmemory for project-specific durable decisions, unresolved issues, and environment caveats when an Agentmemory tool is available.
- Do not read Markdown under `node_modules/`, `.next/`, or other generated dependency/build directories unless explicitly needed for a dependency issue.
- If a doc was already read in the current session and has not changed, do not read it again.
- If implementation decisions change, update the relevant docs before finishing.
- During work, save only durable project-level facts to Agentmemory: important design decisions, root causes of non-obvious bugs, and environment-dependent caveats.
- Never save API keys, secrets, personal information, or very temporary notes to Agentmemory.
- If Agentmemory is not available in the current tool environment, state that briefly and continue using project docs as the authoritative record.

## Default Doc Order

1. `Docs/AI_CONTEXT.md`
2. `Docs/AI_TASKS.md`
3. `Docs/BUGS.md` when handling bugs
4. `Docs/ARCHITECTURE.md` when changing design, DB, providers, or PWA architecture
5. `Docs/STORY_SYSTEM.md` when changing story progression, director, foreshadowing, or narrative quality logic
6. Tail of `Docs/AI_WORKLOG.md` only when recent decisions matter
7. Agentmemory search for durable project decisions, unresolved issues, and caveats, if available


# AI Coding Agent Rules

## Project role split

This project uses the following AI workflow:

- Claude Code / Codex:
  - research
  - planning
  - architecture decisions
  - implementation of risky or design-heavy tasks
  - task splitting
  - prompt generation for local LLM
  - diff review
  - risk analysis

- Local LLM:
  - small implementation tasks only
  - one file and one purpose per task
  - no architecture decisions

- Human:
  - final approval
  - build verification
  - gameplay verification
  - Blueprint reference checks

## Global rules

- Do not make unrelated changes
- Do not rename public APIs unless explicitly requested
- Do not rename UFUNCTION / UPROPERTY / Blueprint-facing names unless explicitly requested
- Do not change build settings, plugin settings, or project configuration unless explicitly requested
- Prefer small, reviewable diffs
- For complex tasks, plan first
- When asked to save usage, split tasks into:
  - tasks Claude Code / Codex should implement directly
  - tasks safe for local LLM
  - tasks the human should verify
- Reviews should focus on the diff, not a full redesign
- If unclear, ask or mark as "needs confirmation"

## Local LLM task policy

A task is safe for local LLM only if:

- it has a clearly defined target file
- it has a clearly defined edit range
- it does not require architecture decisions
- it does not require changing public APIs
- it does not touch Blueprint-facing names
- it can be reviewed from a small diff

Unsafe tasks should stay with Claude Code / Codex.

## Review policy

After implementation, create a summary for a separate review session:

- original goal
- changed files
- what was implemented by Claude Code / Codex
- what was delegated to local LLM
- risks to check
- manual verification steps