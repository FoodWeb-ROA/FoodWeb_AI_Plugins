'use strict'

// Terminal inline-image protocols. Both emitters size the image in CELLS, not
// pixels, so the cursor advances by a known column count and the surrounding
// TUI layout is unaffected.

const ESC = '\x1b'
const BEL = '\x07'
const ST = ESC + '\\'

function detectProtocol(env = process.env) {
  const term = (env.TERM || '').toLowerCase()
  const prog = env.TERM_PROGRAM || ''

  // Kitty graphics protocol.
  if (term.includes('kitty') || env.KITTY_WINDOW_ID) return 'kitty'
  if (prog.toLowerCase() === 'ghostty' || env.GHOSTTY_RESOURCES_DIR) return 'kitty'

  // iTerm2 OSC 1337 protocol.
  if (prog === 'iTerm.app' || env.ITERM_SESSION_ID) return 'iterm2'
  if (prog === 'WezTerm') return 'iterm2'
  // VS Code / Cursor: xterm.js image support, gated on
  // terminal.integrated.enableImages.
  if (prog === 'vscode' || prog === 'Cursor') return 'iterm2'
  if (prog === 'Hyper' || prog === 'Tabby') return 'iterm2'

  return null
}

function emitIterm2(png, cols, rows) {
  const b64 = png.toString('base64')
  return (
    `${ESC}]1337;File=inline=1;size=${png.length};width=${cols};height=${rows};` +
    `preserveAspectRatio=1;doNotMoveCursor=0:${b64}${BEL}`
  )
}

function emitKitty(png, cols, rows) {
  const b64 = png.toString('base64')
  const CHUNK = 4096
  // f=100 is PNG; c/r place the image into an exact cell box.
  const head = `a=T,f=100,c=${cols},r=${rows}`
  if (b64.length <= CHUNK) {
    return `${ESC}_G${head};${b64}${ST}`
  }
  let out = ''
  for (let i = 0; i < b64.length; i += CHUNK) {
    const part = b64.slice(i, i + CHUNK)
    const more = i + CHUNK < b64.length ? 1 : 0
    // Control keys go on the first chunk only; continuations carry just m=.
    out += i === 0 ? `${ESC}_G${head},m=1;${part}${ST}` : `${ESC}_Gm=${more};${part}${ST}`
  }
  return out
}

function emitter(protocol) {
  if (protocol === 'iterm2') return emitIterm2
  if (protocol === 'kitty') return emitKitty
  return null
}

module.exports = { detectProtocol, emitter, emitIterm2, emitKitty }
