# Distributing FoodWeb plugins across the team

This marketplace (`foodweb-ai-plugins`) ships the `superpowers-foodweb` plugin.
Below: how to get it onto every developer's Claude Code, keep it updated, and
optionally enforce it.

> Replace `foodweb-ai/FoodWeb_AI_Plugins` below with the real GitHub slug once
> this repo is pushed.

## 1. Host it

Push this repo to GitHub (the marketplace source is the repo root — Claude Code
reads `.claude-plugin/marketplace.json` from it):

```bash
git remote add origin git@github.com:foodweb-ai/FoodWeb_AI_Plugins.git
git push -u origin main
```

Any git host works (GitHub/GitLab/self-hosted). Local paths also work for
testing before a push.

## 2a. Per-developer install (manual)

Each developer runs, once:

```
/plugin marketplace add foodweb-ai/FoodWeb_AI_Plugins
/plugin install superpowers-foodweb@foodweb-ai-plugins
```

`/plugin marketplace add` also accepts a full git URL or a local path
(`/plugin marketplace add /abs/path/to/FoodWeb_AI_Plugins`).

## 2b. Team auto-install (recommended)

Commit the marketplace + enabled-plugin declaration into the **project**
`.claude/settings.json` of each repo that should use these skills (ROA,
ROA_FoodWeb). When a teammate trusts the project folder, Claude Code prompts
them to add the marketplace and enables the plugin automatically — no manual
`/plugin` commands.

`.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "foodweb-ai-plugins": {
      "source": {
        "source": "github",
        "repo": "foodweb-ai/FoodWeb_AI_Plugins"
      }
    }
  },
  "enabledPlugins": {
    "superpowers-foodweb@foodweb-ai-plugins": true
  }
}
```

Notes:
- The marketplace key (`foodweb-ai-plugins`) must match `name` in
  `marketplace.json`. The enable key is `<plugin-name>@<marketplace-name>`.
- Marketplace state is stored once per user in
  `~/.claude/plugins/known_marketplaces.json`, shared across all worktrees.
- A relative `directory`/`file` source resolves against the repo's main
  checkout — fine for worktrees.

## 3. Updates

1. Edit skills / bump `version` in `superpowers-foodweb/.claude-plugin/plugin.json`
   and in the plugin entry in `.claude-plugin/marketplace.json`.
2. Push.
3. Developers refresh: `/plugin marketplace update foodweb-ai-plugins`
   (or `/plugin marketplace update` for all). Updated plugins re-resolve on next
   session.

Stable vs latest channels: point two marketplaces at different `ref`s/tags of
this repo and assign them to user groups via managed settings.

## 4. CI / containers (optional)

Pre-seed images so no runtime clone is needed:

```bash
CLAUDE_CODE_PLUGIN_CACHE_DIR=/opt/claude-seed claude plugin marketplace add foodweb-ai/FoodWeb_AI_Plugins
CLAUDE_CODE_PLUGIN_CACHE_DIR=/opt/claude-seed claude plugin install superpowers-foodweb@foodweb-ai-plugins
```

Then set `CLAUDE_CODE_PLUGIN_SEED_DIR=/opt/claude-seed` in the image.

## 5. Org-wide enforcement (optional)

For central control, use **managed settings** (`managed-settings.json`):
- `extraKnownMarketplaces` — register the marketplace for everyone without them
  running `/plugin marketplace add`.
- `strictKnownMarketplaces` — restrict which marketplaces users may add (lock to
  this one / an internal host). Users cannot override managed settings.
