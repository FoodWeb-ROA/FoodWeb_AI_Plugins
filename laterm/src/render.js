'use strict'

// TeX -> SVG (MathJax, pure JS) -> PNG (resvg, prebuilt native). Both stages are
// synchronous on purpose: the renderer sits in the PTY data path, so anything
// async would reorder the output stream.

const config = require('./config')

const { mathjax } = require('mathjax-full/js/mathjax.js')
const { TeX } = require('mathjax-full/js/input/tex.js')
const { SVG } = require('mathjax-full/js/output/svg.js')
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js')
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js')
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js')
const { Resvg } = require('@resvg/resvg-js')

const EM_PX = 16
const EX_PX = 8

const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)

const mathDocument = mathjax.document('', {
  InputJax: new TeX({ packages: AllPackages }),
  // fontCache 'local' inlines glyph paths per equation, so the SVG is
  // self-contained and resvg needs no font files at all.
  OutputJax: new SVG({ fontCache: 'local' }),
})

const cache = new Map()

function applyMacros(tex) {
  let out = tex
  for (const [macro, replacement] of Object.entries(config.macros)) {
    out = out.split(macro).join(replacement)
  }
  return out
}

// MathJax sizes its root <svg> in `ex`, which resvg does not understand.
// Rewrite to px and hand back the aspect ratio.
function toPixelSvg(svg) {
  const w = /\bwidth="([\d.]+)ex"/.exec(svg)
  const h = /\bheight="([\d.]+)ex"/.exec(svg)
  if (!w || !h) return null
  const pxW = Number.parseFloat(w[1]) * EX_PX
  const pxH = Number.parseFloat(h[1]) * EX_PX
  if (!(pxW > 0) || !(pxH > 0)) return null
  const sized = svg
    .replace(/\bwidth="[\d.]+ex"/, `width="${pxW.toFixed(2)}"`)
    .replace(/\bheight="[\d.]+ex"/, `height="${pxH.toFixed(2)}"`)
    // resvg has no CSS cascade to resolve `currentColor` against.
    .split('currentColor')
    .join(config.foreground)
  return { svg: sized, pxW, pxH }
}

/**
 * Rasterize one expression into a cell box.
 * Returns { png, cols, rows } or null when the TeX is not renderable.
 */
function renderToPng(tex, display, cols, rows) {
  const key = `${display ? 'D' : 'I'}:${rows}:${cols}:${tex}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  let result = null
  try {
    const node = mathDocument.convert(applyMacros(tex), {
      display,
      em: EM_PX,
      ex: EX_PX,
      containerWidth: 80 * EM_PX,
    })
    const raw = adaptor.innerHTML(node)
    // MathJax emits `<merror>` markup rather than throwing on bad input.
    if (!raw || raw.includes('data-mjx-error') || raw.includes('merror')) {
      cache.set(key, null)
      return null
    }
    const sized = toPixelSvg(raw)
    if (!sized) {
      cache.set(key, null)
      return null
    }
    const targetH = Math.max(8, rows * config.cellPixelHeight)
    const png = new Resvg(sized.svg, {
      fitTo: { mode: 'height', value: Math.round(targetH) },
      font: { loadSystemFonts: false },
      background: 'rgba(0,0,0,0)',
    })
      .render()
      .asPng()
    result = { png, cols, rows }
  } catch (err) {
    if (config.debug) process.stderr.write(`[laterm] render failed: ${err.message}\n`)
    result = null
  }

  if (cache.size >= config.cacheSize) {
    // Cheapest sound eviction: drop the oldest insertion.
    cache.delete(cache.keys().next().value)
  }
  cache.set(key, result)
  return result
}

module.exports = { renderToPng, applyMacros }
