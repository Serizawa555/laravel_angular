---
description: Scan this repo and generate/refresh the .claude/ context kit (root CLAUDE.md + context docs). Portable — copy this file into any project.
---

# Bootstrap the `.claude/` context kit

Your job: detect what kind of project this is, then generate a tailored `.claude/`
documentation kit so future sessions orient fast instead of re-scanning the repo.
**Generate only the parts that apply** — a static site has no backend doc; a repo
with no design tokens has no token table.

## Step 0 — Don't clobber existing work
```bash
ls -la .claude/ 2>/dev/null; ls .claude/context/ 2>/dev/null; test -f CLAUDE.md && echo "CLAUDE.md exists"
```
- If root `CLAUDE.md` and `.claude/context/` already have content, **stop and report
  what's there** — ask whether to refresh a specific file or regenerate. Never
  overwrite a populated kit without confirmation.
- If `.claude/` is empty or missing, proceed.

**Preserve hard-won conventions (critical on a refresh).** Before regenerating anything,
READ the existing root `CLAUDE.md` "Non-negotiables", `.claude/context/*`, and
`.claude/workflows/*`. These hold rules learned the hard way (framework gotchas, "do X not Y"
lessons) that you CANNOT re-derive by scanning code. Carry them forward verbatim — never
overwrite or regenerate them from the source tree alone. When in doubt, keep the existing rule
and only append.

## Step 1 — Detect the stack (read-only sweep; prefer the Explore agent or parallel Grep/Glob)
- **Languages / package managers**: `composer.json`, `package.json`, `go.mod`, … and the monorepo tool if any.
- **Frontend**: framework, styling system (Tailwind / CSS custom properties / Sass),
  component conventions, design tokens, build pipeline, entry points.
- **Backend / framework**: web framework, Actions/Services/modules, hook or DI
  patterns, routing, auth.
- **Data / content model**: DB schema, ORM models, CMS config (content types, fields, views), migrations.
- **Integrations**: search, SSO, payment, queues, third-party APIs.
- **Build & tooling**: scripts, CI, lint/format config, env files.
- **Local dev**: containerization (Sail / Docksal / DDEV / Lando / bare) and the command
  prefix the team actually uses (`./vendor/bin/sail`, `fin`, `ddev`, `docker compose`).
- **Existing AI config**: `AGENTS.md`, `.cursor/rules`, `PROMPT.md` — read these; they
  often encode conventions and scope worth folding in.

## Step 2 — Generate the kit (omit any that don't apply)

### root `CLAUDE.md` — the auto-loaded entry point
- One-line description of what `.claude/` holds and where.
- A **routing table** pointing at `.claude/context/*` and `.claude/workflows/*`.
- A **context-maintenance directive**: a `git diff main --name-only` command plus a trigger
  table mapping changed paths → which context file to update.
- A **Non-negotiables / key conventions** quick reference (money handling, auth model, token
  syntax, hook/DI pattern, local-dev prefix, "do not edit generated files", …).

### `.claude/context/project-overview.md`
Stack table, a small ASCII flow of how the pieces connect, repo layout, key directories,
build/run/test commands, local-dev prefix.

### `.claude/context/<backend>.md` *(only if there's app/server code)*
Structure, the Actions/Services/modules + DI or hook pattern, routing, auth, key integrations, packages.

### `.claude/context/<frontend>.md` *(only if there's a frontend)*
Components and where they live, templating/styling conventions, state model, routing/i18n,
libraries, build pipeline.

### `.claude/context/content-model.md` *(only if there's a schema/CMS/ORM)*
Entities/content types + key fields, relationships, enums, naming conventions, where config lives.

### `.claude/workflows/*` and `.claude/docs/*` *(preserve if present)*
Step-by-step task guides (backend-dev, frontend-dev, config, …) and convention/reference notes
(the "why"). If they already exist, treat them as source of truth: keep/extend, don't regenerate.
Seed `workflows/` with the task areas this project actually has.

### `.claude/settings.json` *(create only if absent — never overwrite; merge)*
Add the SessionStart nudge + a sensible read-only permission allow-list for this stack.

### `.claude/commands/bootstrap-context.md` (this file — keep it portable)
Make sure this file survives into any project you scaffold from here.

## Step 3 — Principles
- **Point, don't duplicate.** Docs say *where to look* and *what's non-obvious* — not
  copies of code that will drift.
- **Tables over prose** for component lists, conventions, path→doc mappings.
- **Absolute dates**, nothing that goes stale within a sprint.
- **Match the repo's own terminology** (its model names, its variant names).
- Keep each file skimmable.

## Step 4 — Report
List what you created (and what you skipped, with one-line reasons). Note that the kit
is committed/shareable, and that `/bootstrap-context` can refresh a specific file.
