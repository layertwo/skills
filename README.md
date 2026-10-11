# skills

My personal OpenCode skills.

## Install

OpenCode loads these skills from the repo's HTTP catalog. Point the `skills` array at
the raw GitHub base URL:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "skills": [
    "https://raw.githubusercontent.com/layertwo/skills/mainline/skills/"
  ]
}
```

The catalog is `skills/index.json`. Bump a skill's `version` there whenever you change
it, or OpenCode keeps serving its cached copy. The model then auto-loads a skill when it
is relevant, or you can mention `@code-simplifier`.

To use a local checkout instead, point `skills` at a single skill directory, e.g.
`"~/skills/skills/code-simplifier"`.

## Skills

- **`code-simplifier`** — reviews recently changed code with three parallel subagents
  (reuse, quality, efficiency), has a judge subagent confirm the findings, then
  simplifies and fixes only what the change touched and verifies behavior is preserved.

## Adding a skill

Create `skills/<id>/<id>.md` with `name` and `description` frontmatter, then add an entry
to `skills/index.json` (`name`, `version`, `files`). The filename sets the skill ID, so
keep it equal to the directory name. Keep supporting files beside it and list them in
`files`.

## License

Apache-2.0. Includes material adapted from Anthropic; see [NOTICE](NOTICE).
