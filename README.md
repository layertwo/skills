# skills

My personal OpenCode skills.

## Install

Point OpenCode at the `skills/` directory in your global config:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "skills": ["~/skills/skills"]
}
```

OpenCode reloads on config change. The model can then auto-load a skill when it is
relevant, or you can mention `@code-simplifier`.

## Skills

- **`code-simplifier`** — reviews recently changed code with three parallel subagents
  (reuse, quality, efficiency), has a judge subagent confirm the findings, then
  simplifies and fixes only what the change touched and verifies behavior is preserved.

## Adding a skill

Create `skills/<id>/SKILL.md` with `name` and `description` frontmatter. The directory
name is the skill ID. Keep supporting files beside it; paths inside the skill are
relative to that directory.

## License

Apache-2.0. Includes material adapted from Anthropic; see [NOTICE](NOTICE).
