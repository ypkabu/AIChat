# Prompt Guide

## Codex Startup

Use repository Markdown as the source of truth. Treat Agentmemory as auxiliary memory only. Do not rely on assistant memory, Agentmemory, or old conversation history when the current project state is documented here.

Read in this order:

1. `Docs/AI_CONTEXT.md`
2. `Docs/AI_TASKS.md`
3. `Docs/BUGS.md` only for bug work
4. `Docs/ARCHITECTURE.md` only for design or schema work
5. The tail of `Docs/AI_WORKLOG.md` only when recent decisions matter
6. Agentmemory search for durable project decisions, unresolved issues, and environment caveats, if an Agentmemory tool is available

Avoid reading all source files. Search first, then open only the relevant file ranges.

Do not scan generated/dependency Markdown such as `node_modules/**/*.md`, `.next/**/*.md`, or build output docs unless the task is specifically about that dependency. Project docs live under `Docs/` and root-level agent instructions.

## Agentmemory

- Agentmemory is a secondary recall aid, not the official source of truth.
- At the start of work, search Agentmemory only after reading the required project docs.
- During work, save durable project-level facts when they will help future sessions: important design decisions, non-obvious bug root causes, unresolved issues, and environment-dependent caveats.
- Do not save API keys, secrets, personal information, one-off test data, or notes that are too temporary to matter later.
- If an Agentmemory tool is unavailable, say so briefly and continue with repository docs.

## End Of Work

- Update `Docs/AI_TASKS.md` when task status changes.
- Append a short entry to `Docs/AI_WORKLOG.md`.
- Update `Docs/BUGS.md` when a bug is found, fixed, or intentionally deferred.
- Update `Docs/AI_CONTEXT.md` only when a project-level rule changes.
- Save only future-relevant durable facts to Agentmemory when the tool is available.
