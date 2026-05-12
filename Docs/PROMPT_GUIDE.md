# Prompt Guide

## Codex Startup

Use repository Markdown as the source of truth. Do not rely on assistant memory or old conversation history when the current project state is documented here.

Read in this order:

1. `Docs/AI_CONTEXT.md`
2. `Docs/AI_TASKS.md`
3. `Docs/BUGS.md` only for bug work
4. `Docs/ARCHITECTURE.md` only for design or schema work
5. The tail of `Docs/AI_WORKLOG.md` only when recent decisions matter

Avoid reading all source files. Search first, then open only the relevant file ranges.

Do not scan generated/dependency Markdown such as `node_modules/**/*.md`, `.next/**/*.md`, or build output docs unless the task is specifically about that dependency. Project docs live under `Docs/` and root-level agent instructions.

## End Of Work

- Update `Docs/AI_TASKS.md` when task status changes.
- Append a short entry to `Docs/AI_WORKLOG.md`.
- Update `Docs/BUGS.md` when a bug is found, fixed, or intentionally deferred.
- Update `Docs/AI_CONTEXT.md` only when a project-level rule changes.
