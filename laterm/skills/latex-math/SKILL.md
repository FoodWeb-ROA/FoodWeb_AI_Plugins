---
name: latex-math
description: Write every mathematical answer as terminal-renderable LaTeX. Use when a reply contains any equation, formula, derivation, matrix, or symbolic expression — this terminal rasterizes $...$ and $$...$$ into inline images, and math written any other way stays unrendered ASCII.
---

# Terminal LaTeX output contract

This session runs under a PTY renderer that scans output for math delimiters,
rasterizes the TeX, and replaces it with an inline image sized to the exact
number of cells the source text occupied. Math that violates the rules below is
passed through as literal source and the reader sees `\frac{a}{b}` instead of a
fraction.

## Always

- Write **all** math as LaTeX, unprompted. Never ASCII-art math (`x^2` alone,
  `sqrt(x)`, `sum_{i=1}`, `|x|` fences, aligned `=` columns).
- `$...$` for a symbol or a short expression sitting in prose.
- `$$...$$` for anything multi-line-shaped: fractions, integrals, sums with
  limits, matrices, derivations, aligned steps.
- Put a `$$...$$` block on its own line, nothing else on that line.

## Never

- **Never write `\\` or `\\\\` inside math.** Use the macro `@nl` instead. A
  literal backslash pair does not survive the shell round trip.
- Never put a newline inside a math block — inline or display. One block, one
  line, however long.
- Never nest `$` inside a math block, and never put a `$` in the same block as
  the math for currency.
- Never split one equation across two blocks, and never colorize or style text
  inside a block.
- Never put a fraction, integral, or a stacked construct in inline `$...$` — it
  gets squeezed into one cell row. Promote it to `$$...$$`.

## Row separators

```
$$\begin{bmatrix} 1 & 2 @nl 3 & 4 \end{bmatrix}$$
$$\begin{cases} x & x \ge 0 @nl -x & x < 0 \end{cases}$$
$$\begin{aligned} f(x) &= x^2 @nl f'(x) &= 2x \end{aligned}$$
```

## Length

An equation wider than the terminal line cannot be rendered — a cell box does
not wrap. Break a long derivation into several `$$...$$` lines, one step each,
rather than one wide block.

## What renders and what does not

The inline detector is deliberately conservative so that shell variables and
prices are left alone. Inline `$...$` renders when the content holds a LaTeX
operator (`\`, `^`, `_`, `{`, `}`), is a single symbol (`$x$`, `$f'$`), or is a
plain equation containing both an operator and a letter (`$a + b = c$`).

```
GOOD  The bound is $O(n \log n)$ for all $n \ge 2$.
GOOD  $$\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}$$
GOOD  $$\nabla f = \left( \frac{\partial f}{\partial x}, \frac{\partial f}{\partial y} \right)$$

BAD   $\frac{\sqrt{\pi}}{2}$              fraction inline -> unreadable
BAD   $$\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$$   `\\` -> use @nl
BAD   $$x = 1
      y = 2$$                             newline inside a block
BAD   The cost is $12 per unit            fine as prose; just never mix with math
```

Prose, code, file paths and shell snippets stay exactly as they are — this
contract governs mathematics only.
