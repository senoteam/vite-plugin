import path from 'node:path'

const cssInjectorText = `
function injectStyle(css, insertAt = 'top') {
  if (!css || typeof document === 'undefined') return
  const head = document.head || document.querySelector('head')
  const firstChild = head.querySelector(':first-child')
  const style = document.createElement('style')
  style.appendChild(document.createTextNode(css))
  if (insertAt === 'top' && firstChild) {
    head.insertBefore(style, firstChild)
  } else {
    head.appendChild(style)
  }
}
`

export default ({ insertAt = 'top' } = {}) => {
  const cssCodes = []
  const cssLangs = ['.css', '.less']
  return {
    name: '@senojs/rollup-plugin-style-inject',
    apply: 'build',
    transform(code, id) {
      const isCSS = cssLangs.includes(path.extname(id))
      if (isCSS) {
        cssCodes.push(code)
        return { code: '', map: null }
      }
    },
    footer: cssInjectorText,
    renderChunk(code, chunk) {
      if (chunk.isEntry) {
        const cssString = cssCodes
          .join('')
          .replace(/ *\\9/g, '')
          .replace(/\\(\d+)/g, '0o$1')
        const injections = `injectStyle(${JSON.stringify(cssString)}, '${insertAt}')`
        return { code: code + injections, map: null }
      }
    },
  }
}
