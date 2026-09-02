'use strict'

// Env-driven config. All knobs are LATERM_*; every one has a working default.

function num(name, fallback, min, max) {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function bool(name, fallback) {
  const raw = process.env[name]
  if (raw == null || raw === '') return fallback
  return raw !== '0' && raw.toLowerCase() !== 'false'
}

// Glyph color. MathJax emits `currentColor`, which resvg cannot resolve — it is
// substituted literally, so a wrong value here means invisible equations.
function foreground() {
  const raw = process.env.LATERM_FG
  if (raw && /^#[0-9a-fA-F]{3,8}$/.test(raw)) return raw
  // COLORFGBG is "fg;bg" as xterm palette indices; 0-6 + 8 read as a dark bg.
  const cfb = process.env.COLORFGBG
  if (cfb) {
    const bg = Number.parseInt(String(cfb).split(';').pop(), 10)
    if (Number.isFinite(bg) && bg >= 7 && bg !== 8) return '#1c1c1c'
  }
  return '#e6e6e6'
}

module.exports = {
  // Cell rows each equation is allowed to occupy. Height 1 is the only value
  // that keeps cursor advance identical to the raw text it replaced, so the
  // TUI's own layout math stays correct across repaints. Raising it trades
  // that fidelity for legibility.
  inlineHeight: num('LATERM_INLINE_HEIGHT', 1, 1, 8),
  displayHeight: num('LATERM_DISPLAY_HEIGHT', 1, 1, 20),
  // Pixel height per cell row used when rasterizing; 2x for crispness.
  cellPixelHeight: num('LATERM_CELL_PX', 34, 8, 200),
  // Cap per PTY chunk. Repaint storms re-emit every visible equation, so an
  // unbounded count turns into megabytes of base64 per second.
  maxImagesPerChunk: num('LATERM_MAX_PER_CHUNK', 12, 1, 200),
  maxTexLength: num('LATERM_MAX_TEX', 400, 20, 4000),
  cacheSize: num('LATERM_CACHE_SIZE', 500, 16, 20000),
  foreground: foreground(),
  protocol: (process.env.LATERM_PROTOCOL || '').toLowerCase() || null,
  debug: bool('LATERM_DEBUG', false),
  enabled: bool('LATERM_ENABLED', true),
  // Macros applied before handing TeX to MathJax. `@nl` exists because a
  // literal `\\` cannot survive a shell/PTY round trip intact.
  macros: { '@nl': '\\\\' },
}
