# laterm

LaTeX math rendered in the terminal while you use Claude Code.

Two halves:

- **A PTY wrapper** — `laterm claude` runs Claude Code inside a pseudoterminal,
  scans its output for `$...$` / `$$...$$`, rasterizes the TeX, and replaces it
  with a terminal inline-image escape.
- **A skill** — `laterm:latex-math`, loaded into context automatically whenever
  the wrapper is active, so Claude writes math the renderer can actually draw.

## Why a wrapper and not an editor extension

[LaTerM](https://github.com/MaxwellsEquation/LaTerM), which this plugin takes
its idea and its `@nl` macro convention from, is an xterm.js addon: it hooks
`terminal.write()` on a JS terminal instance. That cannot be applied to VS
Code's or Cursor's built-in terminal — extensions run in a separate Node
process from the workbench renderer that owns the xterm object, and
`vscode.Terminal` exposes no renderer hook
([microsoft/vscode-discussions#322](https://github.com/microsoft/vscode-discussions/discussions/322)).

So the interception happens one layer down, at the PTY, and the drawing is done
by the terminal's own inline-image support instead of a DOM overlay. Result: it
works in the real integrated terminal, and in iTerm2, WezTerm, Ghostty and
Kitty, with no editor patching.

## Requirements

- Node >= 18. First run installs three deps (`node-pty`, `mathjax-full`,
  `@resvg/resvg-js`), all prebuilt — no compiler needed.
- A terminal with an inline-image protocol:

  | Terminal | Protocol | Notes |
  | --- | --- | --- |
  | VS Code / Cursor | iTerm2 | needs `"terminal.integrated.enableImages": true` |
  | iTerm2 | iTerm2 | works out of the box |
  | WezTerm | iTerm2 | works out of the box |
  | Ghostty, Kitty | Kitty graphics | works out of the box |
  | Terminal.app | none | no image support; passes through as plain text |

- Under tmux, add `set -g allow-passthrough on`.

## Install

Add the marketplace and enable the plugin:

```
/plugin marketplace add FoodWeb-ROA/FoodWeb_AI_Plugins
/plugin install laterm@foodweb-ai-plugins
```

Then alias the launcher so it is what you actually type:

```bash
# ~/.zshrc
alias claudex='~/.claude/plugins/marketplaces/foodweb-ai-plugins/laterm/bin/laterm claude'
```

Run `laterm --doctor` (or `/laterm-doctor` inside a session) to check protocol
detection, dependencies and a render probe.

## Usage

```bash
laterm claude            # Claude Code with math rendering
laterm claude --resume   # arguments pass straight through
laterm                   # same as `laterm claude`
laterm -- python         # wrap anything, not just Claude
```

Rendering is only enabled inside the wrapper. A plain `claude` session leaves
the skill unloaded, so Claude does not emit LaTeX that would show up as raw
source.

## How it renders

`TeX → MathJax SVG → resvg PNG → inline-image escape`. Both stages are
synchronous, because the renderer sits in the PTY data path and anything async
would reorder the stream. Rendered images are cached by
`(tex, display, cols, rows)`.

The load-bearing detail is **cell-exact sizing**: an equation is emitted into a
box exactly as many cells wide as the source text it replaced, so the cursor
advances by the same column count it would have anyway and the surrounding TUI
layout is untouched. Claude Code re-sends identical characters on every repaint,
and the cache makes re-rendering them free.

That is also the main limitation. Height defaults to **one cell row**, because
one row is the only height that keeps cursor advance identical. Tall constructs
— big fractions, matrices — are legible only if you raise
`LATERM_DISPLAY_HEIGHT`, and raising it can misalign Claude's own redraws. Start
at 1, raise it if you would rather have readable matrices than a stable prompt.

The detector never touches the alternate screen (editors, pagers), never matches
across an escape sequence or a newline, and skips anything wider than the
current line, since a cell box cannot wrap.

## Configuration

All env vars, all optional:

| Var | Default | Meaning |
| --- | --- | --- |
| `LATERM_ENABLED` | `1` | `0` passes output through untouched |
| `LATERM_PROTOCOL` | auto | force `iterm2` or `kitty` |
| `LATERM_FG` | `#e6e6e6` | glyph color (MathJax `currentColor` substitute) |
| `LATERM_INLINE_HEIGHT` | `1` | cell rows for `$...$` |
| `LATERM_DISPLAY_HEIGHT` | `1` | cell rows for `$$...$$` |
| `LATERM_CELL_PX` | `34` | raster pixels per cell row |
| `LATERM_MAX_PER_CHUNK` | `12` | images per PTY chunk, caps repaint floods |
| `LATERM_MAX_TEX` | `400` | longest expression considered |
| `LATERM_CACHE_SIZE` | `500` | rendered-image cache entries |
| `LATERM_DEBUG` | `0` | log render failures and a render/skip tally |

## The `@nl` constraint

A literal `\\` cannot survive the shell/PTY round trip, so row separators are
written `@nl` and expanded before MathJax sees them — same convention as
upstream LaTerM. The skill states this as a hard rule; `@nl` is the only macro
defined by default.

## Credits

Idea, heuristics and the `@nl` macro convention from
[MaxwellsEquation/LaTerM](https://github.com/MaxwellsEquation/LaTerM) (MIT).
This is an independent PTY-level implementation, not a fork — it shares no code.
