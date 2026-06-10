# FoodWeb AI Plugins

FoodWeb's internal [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugins).

## Plugins

| Plugin | What |
|--------|------|
| `superpowers-foodweb` | FoodWeb fork of [obra/superpowers](https://github.com/obra/superpowers) — skills for TDD, debugging, planning, code review, and multi-agent orchestration. FoodWeb customizations: worktrees pinned to `.worktrees/` and **opt-in only**, dynamic-workflow-aware plan execution, platform-agnostic tooling. |

## Install (per developer)

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

Updates: bump `version` in `plugin.json` + `marketplace.json`, push, then
`/plugin marketplace update foodweb-ai-plugins`. Private repo works — Claude Code
clones via each developer's git credentials (org members have access).

## Repo layout

```
.claude-plugin/marketplace.json   # marketplace manifest (lists plugins)
superpowers-foodweb/              # the plugin
  .claude-plugin/plugin.json      # Claude Code plugin manifest
  .cursor-plugin/plugin.json      # Cursor plugin manifest
  skills/                         # skill library
  agents/                         # subagent definitions
  hooks/                          # SessionStart hook (injects using-superpowers)
```

## License

`superpowers-foodweb` is MIT, forked from obra/superpowers (© Jesse Vincent).
