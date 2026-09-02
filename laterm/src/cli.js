'use strict'

// laterm — spawn a command in a PTY and rewrite math in its output stream into
// terminal inline images. Default command is `claude`.

const os = require('os')
const config = require('./config')
const { detectProtocol } = require('./graphics')

function usage() {
  process.stdout.write(
    [
      'Usage: laterm [--doctor] [--] [command [args...]]',
      '',
      'Runs a command (default: claude) inside a PTY and renders $...$ / $$...$$',
      'in its output as terminal inline images.',
      '',
      'Env:',
      '  LATERM_ENABLED=0          pass output through untouched',
      '  LATERM_PROTOCOL=iterm2|kitty   force the image protocol',
      '  LATERM_FG=#e6e6e6         glyph color',
      '  LATERM_INLINE_HEIGHT=1    cell rows for $...$',
      '  LATERM_DISPLAY_HEIGHT=1   cell rows for $$...$$ (>1 can misalign a TUI)',
      '  LATERM_CELL_PX=34         raster height per cell row',
      '  LATERM_DEBUG=1            log render failures to stderr',
      '',
    ].join('\n')
  )
}

function doctor() {
  const protocol = config.protocol || detectProtocol()
  const lines = [
    `node             ${process.version}`,
    `platform         ${os.platform()}/${os.arch()}`,
    `TERM             ${process.env.TERM || '(unset)'}`,
    `TERM_PROGRAM     ${process.env.TERM_PROGRAM || '(unset)'}`,
    `protocol         ${protocol || 'NONE — output will pass through unrendered'}`,
    `foreground       ${config.foreground}`,
    `inline/display   ${config.inlineHeight}/${config.displayHeight} cell rows`,
  ]
  for (const dep of ['node-pty', 'mathjax-full', '@resvg/resvg-js']) {
    let state
    try {
      require.resolve(dep)
      state = 'ok'
    } catch {
      state = 'MISSING — run npm install in the plugin root'
    }
    lines.push(`${dep.padEnd(16)} ${state}`)
  }
  if (process.env.TMUX) {
    lines.push('tmux             detected — images need allow-passthrough on')
  }
  if (protocol === 'iterm2' && process.env.TERM_PROGRAM === 'vscode') {
    lines.push('vscode           needs "terminal.integrated.enableImages": true')
  }
  let render = 'skipped (deps missing)'
  try {
    const { renderToPng } = require('./render')
    render = renderToPng('E = mc^2', false, 10, 1) ? 'ok' : 'FAILED'
  } catch (err) {
    render = `FAILED — ${err.message}`
  }
  lines.push(`render probe     ${render}`)
  process.stdout.write(lines.join('\n') + '\n')
}

function main(argv) {
  if (argv[0] === '--help' || argv[0] === '-h') return usage(), 0
  if (argv[0] === '--doctor') return doctor(), 0
  if (argv[0] === '--') argv = argv.slice(1)

  const command = argv[0] || 'claude'
  const args = argv.slice(1)

  const pty = require('node-pty')
  const { LatexStreamFilter } = require('./filter')

  const protocol = config.protocol || detectProtocol()
  const stdout = process.stdout
  const stdin = process.stdin

  if (!protocol && config.enabled) {
    process.stderr.write(
      '[laterm] no inline-image protocol detected for this terminal; ' +
        'running without rendering (laterm --doctor for details)\n'
    )
  }

  const child = pty.spawn(command, args, {
    name: process.env.TERM || 'xterm-256color',
    cols: stdout.columns || 80,
    rows: stdout.rows || 24,
    cwd: process.cwd(),
    env: {
      ...process.env,
      // The SessionStart hook keys the LaTeX instructions off this.
      LATERM_ACTIVE: '1',
      LATERM_PROTOCOL_ACTIVE: protocol || 'none',
    },
  })

  const filter = new LatexStreamFilter({
    protocol,
    getCols: () => stdout.columns || 80,
  })

  // A held-back fragment must never outlive the burst that produced it.
  let carryTimer = null
  const scheduleCarryFlush = () => {
    if (carryTimer) clearTimeout(carryTimer)
    carryTimer = setTimeout(() => {
      carryTimer = null
      const pending = filter.flushCarry()
      if (pending) stdout.write(pending)
    }, 40)
  }

  child.onData((data) => {
    if (carryTimer) {
      clearTimeout(carryTimer)
      carryTimer = null
    }
    stdout.write(filter.process(data))
    if (filter.carry) scheduleCarryFlush()
  })

  const wasRaw = Boolean(stdin.isTTY && stdin.isRaw)
  if (stdin.isTTY) stdin.setRawMode(true)
  stdin.resume()
  stdin.on('data', (buf) => child.write(buf.toString('utf8')))

  const onResize = () => {
    try {
      child.resize(stdout.columns || 80, stdout.rows || 24)
    } catch {
      /* child already gone */
    }
  }
  process.on('SIGWINCH', onResize)

  const forward = (signal) => () => {
    try {
      child.kill(signal)
    } catch {
      /* child already gone */
    }
  }
  process.on('SIGTERM', forward('SIGTERM'))
  process.on('SIGHUP', forward('SIGHUP'))

  child.onExit(({ exitCode, signal }) => {
    const pending = filter.flushCarry()
    if (pending) stdout.write(pending)
    if (stdin.isTTY) stdin.setRawMode(wasRaw)
    stdin.pause()
    if (config.debug) {
      process.stderr.write(
        `[laterm] rendered=${filter.rendered} skipped=${filter.skipped}\n`
      )
    }
    process.exit(signal ? 128 + signal : exitCode)
  })

  return null
}

const rc = main(process.argv.slice(2))
if (rc !== null) process.exit(rc)
