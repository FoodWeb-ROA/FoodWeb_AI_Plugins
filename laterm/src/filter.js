'use strict'

// Rewrites math in a PTY output stream into inline-image escapes.
//
// Invariant that makes this safe against a redrawing TUI: an equation is
// emitted into a cell box exactly as wide as the text it replaced, so the
// cursor lands where it would have anyway. Claude Code re-sends the same
// characters on every repaint, and the render cache makes that idempotent.

const config = require('./config')
const { renderToPng } = require('./render')
const { emitter } = require('./graphics')

const ALT_ON = '\x1b[?1049h'
const ALT_OFF = '\x1b[?1049l'

// Content classes exclude `$`, ESC and newline, so a match can never span an
// escape sequence or a line break.
const DISPLAY_RE = /\$\$([^$\x1b\n]+?)\$\$/g
const INLINE_RE = /\$([^$\x1b\n]+?)\$/g

const LATEX_OPS = /[\\^_{}]/
const SHELL_VAR = /^[A-Za-z_][A-Za-z0-9_]*$/
const PLAIN_MATH = /^[A-Za-z0-9+\-*/=<>().,\s|!]+$/

/**
 * Heuristic gate for inline `$...$`. Shell variables, prices and prose all
 * live in the same delimiter, so the default is "leave it alone".
 */
function looksLikeMath(content) {
  const t = content.trim()
  if (!t || t.length > config.maxTexLength) return false
  if (t.includes('@nl')) return true
  // `$PATH$`-shaped text is a variable, not a symbol. One letter stays math.
  if (t.length > 1 && SHELL_VAR.test(t)) return false
  if (LATEX_OPS.test(t)) return true
  // Single symbol, optionally primed: $x$, $f'$.
  if (/^[A-Za-z]'?$/.test(t)) return true
  // Operator-bearing arithmetic still needs a symbol to distinguish it from
  // currency ranges like "$100 - $50".
  if (PLAIN_MATH.test(t) && /[=<>+\-*/]/.test(t) && /[A-Za-z]/.test(t)) return true
  return false
}

function cellWidth(str) {
  return [...str].length
}

class LatexStreamFilter {
  /**
   * @param {object} opts
   * @param {string} opts.protocol  'iterm2' | 'kitty'
   * @param {() => number} opts.getCols  current terminal width
   */
  constructor({ protocol, getCols }) {
    this.emit = emitter(protocol)
    this.getCols = getCols
    this.carry = ''
    this.inAltScreen = false
    this.rendered = 0
    this.skipped = 0
  }

  get active() {
    return Boolean(this.emit) && config.enabled
  }

  /** Replace one match, or return null to leave the original text in place. */
  _image(match, tex, display, budget) {
    if (budget.left <= 0) return null
    const cols = cellWidth(match)
    // An image wider than the line would have wrapped as text; a cell box
    // cannot wrap, so leave those alone.
    if (cols < 2 || cols > this.getCols() - 1) return null
    const rows = display ? config.displayHeight : config.inlineHeight
    const out = renderToPng(tex.replace(/\s+/g, ' ').trim(), display, Math.max(cols, 4), rows)
    if (!out) {
      this.skipped += 1
      return null
    }
    budget.left -= 1
    this.rendered += 1
    return this.emit(out.png, out.cols, out.rows)
  }

  /**
   * Hold back a trailing fragment that is probably the start of an equation.
   * Anything else is passed through immediately — a stalled stream is far
   * worse than a missed render.
   */
  _splitCarry(text) {
    const idx = text.lastIndexOf('$')
    if (idx === -1) return [text, '']
    const tail = text.slice(idx)
    if (tail.includes('\n') || tail.includes('\x1b')) return [text, '']
    if (tail.length > config.maxTexLength) return [text, '']
    const isOpener = tail === '$' || tail === '$$' || text.slice(idx).startsWith('$$')
    if (isOpener || LATEX_OPS.test(tail) || tail.includes('@nl')) {
      return [text.slice(0, idx), tail]
    }
    return [text, '']
  }

  /** Anything held back by _splitCarry, released unmodified. */
  flushCarry() {
    const pending = this.carry
    this.carry = ''
    return pending
  }

  process(chunk) {
    if (!this.active) return chunk

    // Full-screen programs (editors, pagers) own the screen; do not touch them.
    if (chunk.includes(ALT_ON)) this.inAltScreen = true
    if (chunk.includes(ALT_OFF)) this.inAltScreen = false
    if (this.inAltScreen) {
      const pending = this.flushCarry()
      return pending + chunk
    }

    let text = this.carry + chunk
    this.carry = ''
    const budget = { left: config.maxImagesPerChunk }

    text = text.replace(DISPLAY_RE, (match, tex) => this._image(match, tex, true, budget) ?? match)
    text = text.replace(INLINE_RE, (match, tex) => {
      if (!looksLikeMath(tex)) return match
      return this._image(match, tex, false, budget) ?? match
    })

    const [out, carry] = this._splitCarry(text)
    this.carry = carry
    return out
  }
}

module.exports = { LatexStreamFilter, looksLikeMath }
