---
name: code-simplifier
description: Review code for simplification — the recent changes or, on a full pass, the whole project — with four parallel review subagents and a judge, then fix the obvious findings and confirm the rest with the user, listing all of it in a table.
---

# Code Simplifier

Simplify code — the recent changes, or the whole project — without altering its behavior.

## Phase 1: Choose the scope

Default to the changed code. Switch to the whole project when there are no changes or the user asks for a full-pass review.

- **Changed code**: run `git diff` (use `git diff HEAD` when changes are staged) and review that.
- **Whole project**: review every source file in the project, not just what changed.

Say which scope you picked.

## Phase 2: Launch four review subagents in parallel

Send all four in one message so they run concurrently. Use the `subagent` tool with the read-only `explore` agent, give each the scope from Phase 1, and tell each one to stay inside it: in changed-code mode, report only on the changed code — not refactors of untouched code; in whole-project mode, survey the whole project. Each may search the codebase and the libraries it already imports for existing patterns, methods, or functions that would simplify the code.

1. **Reuse** — find code that re-implements something that already exists. Search the codebase for a pattern, helper, or method that already does the job: shared and utility modules, nearby files, the standard library, and the libraries the project already imports. Flag hand-rolled logic one of them already covers — string and path manipulation, environment checks, ad-hoc type guards, data-shape conversions, sort/group/unique logic. Prefer the standard library or an already-imported library over new code, and do not recommend adding a new dependency unless it is absolutely necessary.

2. **Quality** — find patterns that hurt clarity and maintainability:
   - dead code and leftovers: unused imports, variables, or parameters; unreachable branches; commented-out code; stray debug output
   - redundant state, or values that could be derived
   - state and data shape: the wrong structure for the job (a linear scan where a set or map belongs), one fact stored in more than one place, or a shape that permits states that can never happen
   - parameter sprawl instead of restructuring a function
   - near-duplicate blocks that should be unified
   - leaky abstractions, and stringly-typed code where a constant or type already exists
   - wrong altitude: the change sits at the wrong level of abstraction — a new abstraction for a single caller, a hardcoded or special-cased value where a general fix belongs, a symptom patched instead of the cause, or a function mixing high-level flow with low-level detail. Keep it at the altitude of the surrounding code
   - unnecessary nesting
   - comments that narrate *what* the code does; keep only non-obvious *why*

3. **Efficiency** — find wasted work:
   - repeated reads or computations, duplicate calls, N+1 patterns
   - independent operations run sequentially that could be concurrent
   - new blocking work on hot paths (startup, per-request, per-render)
   - no-op updates in loops or handlers that should be change-guarded
   - existence checks before operating (TOCTOU) — operate and handle the error
   - unbounded structures, missing cleanup, listener leaks

4. **Removal** — find code that should not exist. Search for capability nothing uses: exported functions, types, or modules with no callers; parameters nothing passes; options, flags, or config nobody sets; abstractions that serve a single caller; scaffolding left "for later"; code kept only in case it is needed. Prefer deleting it over simplifying it.

## Phase 3: Confirm with a judge

Launch one more subagent (`explore`, read-only) with the scope and the four reports. It rules on each finding: is it real, does it apply to this code, and is the suggested change correct and behavior-preserving? It discards false positives, duplicates, anything not worth doing, and any finding whose fix would sprawl far beyond the finding itself — past the diff in changed-code mode, past the file in whole-project mode. Return the surviving findings, each with a file and line.

## Phase 4: Present the work as a table

Print the judge's surviving findings as a table before editing anything — one row per finding, with the file and line, what you found, and what happens next. The table is the record of everything this skill does, so keep every row in it. On a whole-project pass, order the rows by impact so the user can triage.

| File | Finding | Action |
| --- | --- | --- |
| `src/config.ts:42` | re-implements the existing `parseConfig()` helper | fix — call the helper |
| `src/loader.ts:88` | only fixable by rewriting the whole function | ask — wider than the finding |

Then decide each row:

- **Obvious** — clear, localized, and behavior-preserving: fix it, no confirmation needed.
- **Judgment call** — larger, ambiguous, or debatable: ask the user.

Ask about the judgment-call rows and wait for the answer. Obvious rows need no question.

## Phase 5: Simplify and fix

Apply the obvious rows and the ones the user approved, with these rules:

- **Preserve functionality.** Change how the code does it, never what it does. Outputs and behavior stay identical.
- **Keep fixes small.** Prefer the smallest edit that resolves a finding. In changed-code mode, simplify only what the change actually touched — one changed line does not license rewriting the whole function, file, or module, and a problem in untouched code gets noted, not fixed here.
- **Never remove** validation, error handling, security checks, tests, or accessibility. Do not change a public signature without checking its callers.
- **Apply project standards.** Follow `AGENTS.md` and the conventions already in the codebase.
- **Enhance clarity.** Reduce unnecessary nesting, drop redundant code and abstractions, use clear names, and prefer `switch` or `if`/`else` over nested ternaries. Choose clarity over brevity.
- **Maintain balance.** Do not over-simplify: no clever one-liners, no merging unrelated concerns, no removing abstractions that aid organization.

Skip anything the judge discarded or the user declined.

## Phase 6: Verify

Run the checks the project already has — tests, typecheck, lint — and confirm behavior is unchanged. If a check fails, revert that simplification rather than editing the test. Finish with a short summary of what was fixed, or confirm the code was already clean.
