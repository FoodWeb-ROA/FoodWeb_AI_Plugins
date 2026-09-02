# FoodWeb AI Plugins

FoodWeb's internal plugin marketplace for [Claude Code](https://code.claude.com/docs/en/plugins), [Codex CLI](https://developers.openai.com/codex/plugins), and Cursor.

## Plugins

| Plugin | What |
|--------|------|
| `superpowers-foodweb` | FoodWeb fork of [obra/superpowers](https://github.com/obra/superpowers) — skills for TDD, debugging, planning, code review, and multi-agent orchestration. FoodWeb customizations: worktrees pinned to `.worktrees/` and **opt-in only**, dynamic-workflow-aware plan execution, platform-agnostic tooling. |
| `laterm` | LaTeX math rendered in the terminal. A PTY wrapper (`laterm claude`) rewrites `$...$` / `$$...$$` in Claude Code's output into terminal inline-image escapes (iTerm2 / Kitty protocols), plus a skill that keeps Claude's math renderable. See [`laterm/README.md`](laterm/README.md). |

## Install (per developer)

### Claude Code

Add this marketplace, then install the plugin:

```
/plugin marketplace add foodweb-ai/FoodWeb_AI_Plugins
/plugin install superpowers-foodweb@foodweb-ai-plugins
```

`/plugin marketplace add` accepts a GitHub `owner/repo`, a git URL, or a local
path. Until this repo is pushed, install from a local clone:

```
/plugin marketplace add /absolute/path/to/FoodWeb_AI_Plugins
/plugin install superpowers-foodweb@foodweb-ai-plugins
```

Restart Claude Code (or `/plugin` → reload) and confirm with `/plugin` that
`superpowers-foodweb` is enabled.

### Codex CLI (v0.117+)

Add the marketplace from the terminal, then install from inside Codex:

```
codex plugin marketplace add FoodWeb-ROA/FoodWeb_AI_Plugins
```

In a Codex session, run `/plugins`, install `superpowers-foodweb`, and start a
new session. Then run `/hooks` and trust the plugin's SessionStart hook — Codex
requires explicit trust before non-managed hooks run; without it, skills still
work but the session-start context injection is skipped. Skills can be invoked
explicitly with `$skill-name` or picked up automatically from their
descriptions.

Codex notes: the `agents/code-reviewer.md` subagent is Claude Code/Cursor-only
(Codex subagents use a different TOML format); the review checklist still ships
inside the `requesting-code-review` skill, so code review works everywhere.

## Team distribution

Consuming repos (ROA, ROA_FoodWeb) declare this marketplace and enable the plugin
in their project `.claude/settings.json`, so teammates are prompted to install on
trusting the project folder — no manual `/plugin` commands:

```json
{
  "extraKnownMarketplaces": {
    "foodweb-ai-plugins": {
      "source": { "source": "github", "repo": "FoodWeb-ROA/FoodWeb_AI_Plugins" }
    }
  },
  "enabledPlugins": { "superpowers-foodweb@foodweb-ai-plugins": true }
}
```

For Codex, consuming repos add `.agents/plugins/marketplace.json` pointing at
this repo, so the plugin shows up in every teammate's `/plugins` browser when
they work in that repo:

```json
{
  "name": "foodweb-ai-plugins",
  "plugins": [
    {
      "name": "superpowers-foodweb",
      "source": {
        "source": "git-subdir",
        "url": "https://github.com/FoodWeb-ROA/FoodWeb_AI_Plugins.git",
        "path": "./superpowers-foodweb",
        "ref": "main"
      },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity"
    }
  ]
}
```

Updates: bump `version` in the three `plugin.json` manifests +
`marketplace.json`, push, then `/plugin marketplace update foodweb-ai-plugins`
(Claude Code) or `codex plugin marketplace upgrade` (Codex). Private repo works —
both CLIs clone via each developer's git credentials (org members have access).

## Repo layout

```
.claude-plugin/marketplace.json   # marketplace manifest — Claude Code (Codex also reads it as legacy)
.agents/plugins/marketplace.json  # marketplace manifest — Codex CLI (native)
superpowers-foodweb/              # the plugin
  .claude-plugin/plugin.json      # Claude Code plugin manifest
  .codex-plugin/plugin.json       # Codex CLI plugin manifest
  .cursor-plugin/plugin.json      # Cursor plugin manifest
  skills/                         # skill library (shared by all platforms)
  agents/                         # subagent definitions (Claude Code/Cursor only)
  hooks/                          # SessionStart hook (injects using-superpowers; shared)
```

## License

`superpowers-foodweb` is MIT, forked from obra/superpowers (© Jesse Vincent).
