import path from 'node:path'

const cssInjectorText = `
function injectStyle(css, insertAt = 'top') {
  if (!css || typeof document === 'undefined') return
  const head = document.head
  const style = document.createElement('style')
  if (insertAt === 'top' && head.firstChild) {
    head.insertBefore(style, head.firstChild)
  } else {
    head.appendChild(style)
  }
  style.appendChild(document.createTextNode(css))
}
`

export default ({ insertAt = 'top' } = {}) => {
  const cssCodes = []
  return {
    name: '@senojs/rollup-plugin-style-inject',
    apply: 'build',
    transform(code, id) {
      const isCSS = path.extname(id) === '.css'
      if (isCSS) {
        cssCodes.push(code)
      }
      return { code: isCSS ? '' : code, map: null }
    },
    footer: cssInjectorText,
    renderChunk(code, chunk) {
      if (chunk.isEntry) {
        const injections = cssCodes.map((v) => `injectStyle(\`${v}\`, '${insertAt}')`).join('\n')
        return { code: code + injections, map: null }
      }
    },
  }
}
