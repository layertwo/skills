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

The classes divide the work; they do not limit it: a reviewer that finds a concrete boundary failure outside its class reports that too.

1. **Injection & parsing** — SQL, command, template, and path injection; NoSQL injection; unsafe deserialization; XXE; file upload (unrestricted types, zip-slip); ReDoS and parser bombs. Follow the data past the obvious sink into stored copies, field names, headers, logs, caches, and secondary systems. Test absent, empty, zero, negative, maximum, over-limit, duplicate, mixed-encoding, stale, and reordered inputs where the interface accepts them.

2. **Access & logic** — authentication bypass; broken object-level authorization (IDOR/BOLA) and tenant isolation; privilege escalation; session and CSRF flaws; JWT weaknesses; mass assignment; race conditions (TOCTOU); money and quantity manipulation; workflow or state-machine bypass; replay. Check the same state change through every path — batch, import/export, retry, cancellation, legacy, and error handlers — and compare whether they enforce the same permission. Compare what one component guarantees with what the next assumes. Look for feature abuse: export or backup as exfiltration, import that bypasses validation, search and filters as an oracle, enumeration through differing errors or timing, preview or draft leakage, and webhook or callback URLs fetched by the server.

3. **Crypto, secrets & client-side** — weak or misused cryptography; nonce and IV reuse; weak password-hashing parameters; weak randomness; hardcoded secrets; XSS; CSP; `postMessage` origin checks; open redirect; clickjacking; prototype pollution.

4. **Dependencies, config & defaults** — known-vulnerable dependency versions; typosquats, install scripts (`postinstall`), unpinned dependencies, dependency confusion, abandoned packages; config and IaC; fail-open defaults; debug mode; permissive CORS; default or empty credentials. Also check the basics literally: committed `.env`, `*.pem`, and credential files; unprotected `/debug`, `/admin`, and `/metrics` endpoints; `eval`/`exec` on dynamic input; cookie flags; stack traces in error responses; and git history for reverted security fixes.

## Phase 3: Refute with a verifier

Launch one more subagent (`explore`, read-only) with the scope and the four reports. For each candidate it must re-open every cited file and line and try to **disprove** it, not confirm it:

- Does the cited line actually say what the reviewer claims?
- Is the first step a real entry point, and the last the claimed dangerous operation or effect?
- Is the input actually attacker-controlled, or trusted?
- Is there sanitization, parameterization, or encoding upstream?
- Does the framework, middleware, or an existing helper already handle this?
- Is the dangerous operation reachable from an entry point at all?

A finding survives only if the verifier can name all six:

1. the lower-trust principal and what it can do by design;
2. the input, action, or resource selector it controls;
3. the check that was supposed to stop it;
4. the boundary that gets crossed;
5. the principal or resource that is affected;
6. a concrete result the attacker gets.

No concrete result, no finding. A missing best practice, a defense-in-depth gap where another layer already blocks the attack, and a guessed deployment behavior are not findings. If the decisive fact is outside the repo — proxy behavior, provider settings, identity policy, runtime configuration — do not guess either way; leave it for the needs-validation list. Discard duplicates and any fix that would sprawl far past the finding itself.

**Secrets**: report only secrets present in the scope. Never test, use, or contact the provider with a credential, and never probe a deployed endpoint. Discard obvious placeholders, sample values, and test fixtures.

## Phase 4: Present the work as a table

Print the verifier's surviving findings as a table before editing anything — one row per finding, with the file and line, the severity, what an attacker could do in plain English, and the proposed fix. The table is the record of everything this skill finds, so keep every row in it. On a full audit, order the rows by severity.

| File | Severity | Finding | Action |
| --- | --- | --- | --- |
| `src/db.ts:42` | HIGH | user input concatenated into a SQL query — attacker reads or drops tables | fix — parameterize the query |
| `src/auth.ts:88` | MEDIUM | a revoked user keeps access until their token expires — attacker retains access after removal | ask — needs a revocation design call |

**Severity is impact, not distance from a checklist.** Use likelihood × impact under the conditions the evidence shows, and never let the severity exceed the demonstrated impact.

- **CRITICAL** — an unauthenticated attacker gets code execution, full data-store access, or arbitrary account takeover.
- **HIGH** — an attacker fully defeats an explicit control with real consequences: auth bypass, cross-tenant read or write, stored script execution affecting other users, authenticated code execution.
- **MEDIUM** — a real boundary violation with limited blast radius, uncommon preconditions, or a narrow set of affected resources.
- **LOW** — non-secret internals disclosed, or an effect needing sustained effort for minimal gain.

If you cannot state the concrete damage, the severity is lower than it feels.

Facts the repo cannot settle go below the table as **Needs validation**, with no severity and no fix — each with the exact missing fact and what would settle it. They are leads for the user, not findings.

Then decide each row:

- **Obvious** — clear, localized, and behavior-preserving: fix it, no confirmation needed.
- **Judgment call** — larger, ambiguous, or a design decision (for example, "should this endpoint require auth at all?"): ask the user.

Ask about the judgment-call rows and wait for the answer. Obvious rows need no question.

## Phase 5: Fix

Apply the obvious rows and the ones the user approved, with these rules:

- **Preserve behavior.** Change how the code defends, never what it does for legitimate input.
- **Enforce the invariant.** Name the invariant the code must hold and change the narrowest place that owns it. Add a regression test when the project already has a test suite; do not add a new test framework.
- **Never weaken a check** to make a finding go away — no removed validation, no broadened permission, no swallowed error.
- **Keep fixes small.** In changed-code mode, fix only what the change actually touched; note a problem in untouched code, don't fix it here.
- **Apply project standards.** Follow `AGENTS.md` and the security patterns already in the codebase.
- **Check callers.** Do not change a public signature without checking who calls it.

Skip anything the verifier discarded or the user declined.

## Phase 6: Verify

Run the checks the project already has — tests, typecheck, lint — and confirm the fix closes the issue without breaking behavior. If a check fails, revert that fix rather than editing the test. Finish with a short summary of what was fixed, or confirm the code was clean. Say that a single pass samples the code — it is not proof of exhaustive coverage, especially on a whole-project audit.

## Do not report

Denial of service and resource-exhaustion issues, rate-limiting gaps, and low-impact defense-in-depth observations — they are noise. Skip theoretical issues too: it is better to miss a theoretical one than to flood the review with false positives.
