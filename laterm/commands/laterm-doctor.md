---
description: Diagnose terminal LaTeX rendering — protocol detection, deps, render probe.
---

Run the laterm diagnostic and report the result:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/laterm" --doctor
```

Then interpret it for the user:

- `protocol NONE` — this terminal has no inline-image protocol. Rendering is
  off; the session is running as plain text.
- `vscode needs "terminal.integrated.enableImages": true` — tell them to set it
  in settings and reload the window.
- `tmux detected` — images need `set -g allow-passthrough on` in `.tmux.conf`.
- any dep `MISSING` — run `npm install --omit=dev` in `${CLAUDE_PLUGIN_ROOT}`.
- `render probe FAILED` — report the message verbatim; the rasterizer is broken,
  not the terminal.

If `LATERM_ACTIVE` is unset in the environment, this Claude session was not
started through the wrapper, so nothing will render regardless of protocol —
tell them to relaunch with `laterm claude`.
