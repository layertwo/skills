---
name: code-security-review
description: Review code for security vulnerabilities — the recent changes or, on a full pass, the whole project — with four parallel review subagents and a refuting verifier, then fix the confirmed findings and confirm the rest with the user, listing all of it in a table. Use when asked to review code, a change, or a PR for security issues; check for vulnerabilities; audit a codebase; or look for injection, broken access control, secrets, weak crypto, or vulnerable dependencies.
---

# Code Security Review

Find and fix security vulnerabilities — in the recent changes, or across the whole project — reporting only what an attacker could actually exploit.

## Phase 1: Choose the scope

Default to the changed code. Switch to the whole project when there are no changes or the user asks for a full audit.

- **Changed code**: run `git diff` (use `git diff HEAD` when changes are staged) and review that, plus the code around it the change reaches into.
- **Whole project**: review every source file.

Say which scope you picked. Scope sets *what to look at*, not *what to look for* — the same checklist applies to both, so a dependency added or a config file touched in the change is reviewed just as it would be in a full audit.

In changed-code mode, report only issues the change introduces. Read surrounding and untouched code only to trace whether the new code is reachable — never to report pre-existing issues.

## Phase 2: Launch four review subagents in parallel

Send all four in one message so they run concurrently. Use the `subagent` tool with the read-only `explore` agent, give each the scope from Phase 1, and tell each one to stay inside it. Before flagging anything, each should learn the codebase's existing security patterns — how it authenticates, validates input, and sanitizes output — so a control the framework or existing middleware already provides is not reported as missing.

1. **Injection & parsing** — SQL, command, template, and path injection; NoSQL injection; unsafe deserialization; XXE; file upload (unrestricted types, zip-slip); ReDoS and parser bombs.

2. **Access & logic** — authentication bypass; broken object-level authorization (IDOR/BOLA) and tenant isolation; privilege escalation; session and CSRF flaws; JWT weaknesses; mass assignment; race conditions (TOCTOU); money and quantity manipulation; workflow or state-machine bypass; replay.

3. **Crypto, secrets & client-side** — weak or misused cryptography; nonce and IV reuse; weak password-hashing parameters; weak randomness; hardcoded secrets; XSS; CSP; `postMessage` origin checks; open redirect; clickjacking; prototype pollution.

4. **Dependencies, config & defaults** — known-vulnerable dependency versions; typosquats, install scripts (`postinstall`), unpinned dependencies, dependency confusion, abandoned packages; config and IaC; fail-open defaults; debug mode; permissive CORS; default or empty credentials.

## Phase 3: Refute with a verifier

Launch one more subagent (`explore`, read-only) with the scope and the four reports. For each candidate it must try to **disprove** it, not confirm it:

- Is the input actually attacker-controlled, or trusted?
- Is there sanitization, parameterization, or encoding upstream?
- Does the framework, middleware, or an existing helper already handle this?
- Is the dangerous operation reachable from an entry point at all?

A finding survives only if the verifier can trace a concrete path from an entry point to the dangerous operation with no live mitigation. Keep survivors at confidence **0.8 or higher**; discard anything below that, and anything it cannot demonstrate. Do not downgrade a finding to keep it — an unproven finding is not reported. It also discards duplicates and any fix that would sprawl far past the finding itself.

**Secrets**: report only secrets present in the scope. Never test, use, or contact the provider with a credential. Discard obvious placeholders, sample values, and test fixtures.

## Phase 4: Present the work as a table

Print the verifier's surviving findings as a table before editing anything — one row per finding, with the file and line, the severity, what an attacker could do in plain English, the proposed fix, and the confidence. The table is the record of everything this skill does, so keep every row in it. On a full audit, order the rows by severity so the user can triage.

| File | Severity | Finding | Action |
| --- | --- | --- | --- |
| `src/db.ts:42` | HIGH | user input concatenated into a SQL query — attacker reads or drops tables | fix — parameterize the query |
| `src/auth.ts:88` | MEDIUM | endpoint has no auth check — only fixable by a design decision | ask — needs your call |

Then decide each row:

- **Obvious** — clear, localized, and behavior-preserving: fix it, no confirmation needed.
- **Judgment call** — larger, ambiguous, or a design decision (for example, "should this endpoint require auth at all?"): ask the user.

Ask about the judgment-call rows and wait for the answer. Obvious rows need no question.

## Phase 5: Fix

Apply the obvious rows and the ones the user approved, with these rules:

- **Preserve behavior.** Change how the code defends, never what it does for legitimate input.
- **Never weaken a check** to make a finding go away — no removed validation, no broadened permission, no swallowed error.
- **Keep fixes small.** In changed-code mode, fix only what the change actually touched; note a problem in untouched code, don't fix it here.
- **Apply project standards.** Follow `AGENTS.md` and the security patterns already in the codebase.
- **Check callers.** Do not change a public signature without checking who calls it.

Skip anything the verifier discarded or the user declined.

## Phase 6: Verify

Run the checks the project already has — tests, typecheck, lint — and confirm the fix closes the issue without breaking behavior. If a check fails, revert that fix rather than editing the test. Finish with a short summary of what was fixed, or confirm the code was clean.

## Do not report

Denial of service and resource-exhaustion issues, rate-limiting gaps, and low-impact defense-in-depth observations — they are noise. Skip theoretical issues too: it is better to miss a theoretical one than to flood the review with false positives.
