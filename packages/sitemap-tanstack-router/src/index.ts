import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

export interface SitemapAlternate {
  hreflang: string
  href: string
}

export interface SitemapRoute {
  url: string
  lastmod?: string
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never'
  priority?: number
  alternates?: SitemapAlternate[]
}

export interface SitemapOptions {
  /**
   * Base URL of the site, e.g. 'https://example.com'
   */
  hostname: string

  /**
   * Path to the routeTree.gen.ts file (relative to project root).
   * @default auto-detected
   */
  routeTreeFile?: string

  /**
   * Output file name.
   * @default 'sitemap.xml'
   */
  fileName?: string

  changefreq?: SitemapRoute['changefreq']

  /**
   * @default 0.5
   */
  priority?: number

  /**
   * Accepts ISO 8601 date string or Date object.
   */
  lastmod?: string | Date

  /**
   * Route patterns to exclude. Supports glob-like strings and RegExp.
   */
  exclude?: (string | RegExp)[]

  /**
   * If set, only routes matching these patterns are included.
   */
  include?: (string | RegExp)[]

  /**
   * Locale values to expand `{-$locale}` segments and generate
   * `xhtml:link rel="alternate"` entries for each locale.
   *
   * E.g. `['en', 'zh-CN', 'ja']`
   */
  locales?: string[]

  /**
   * The default locale. When set, an additional `x-default`
   * alternate pointing to this locale is generated.
   */
  defaultLocale?: string

  /**
   * Manually add extra routes not in the route tree.
   */
  extraRoutes?: (string | SitemapRoute)[]

  /**
   * Transform each resolved URL before writing to sitemap.
   * Return `null` or `false` to exclude the route.
   */
  transformUrl?: (
    route: SitemapRoute,
  ) => SitemapRoute | string | null | false | void
}

const LOCALE_SEGMENT_RE = /\{-\$\w+\}/
const LOCALE_SEGMENT_GLOBAL_RE = /\{-\$\w+\}/g

/**
 * Extract route paths from the `FileRoutesByTo` interface.
 */
export function parseRouteTree(content: string): string[] {
  const lines = content.split('\n')
  const startIndex = lines.findIndex((line) =>
    line.includes('export interface FileRoutesByTo {'),
  )
  if (startIndex === -1) return []

  const paths: string[] = []
  const keyRe = /^\s*['"]([^'"]+)['"]\s*:/
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (line.trim() === '}') break
    const match = line.match(keyRe)
    if (match) {
      paths.push(match[1])
    }
  }
  return paths
}

/**
 * Strip dynamic segments from a path:
 *  - `/abouts/$id`  → `/abouts`
 *  - `/trade/$`     → `/trade`
 *  - `/$`           → `/`
 */
export function stripDynamicSegments(path: string): string {
  return path
    .replace(/\/\$\w*/g, '')
    .replace(/^$/, '/')
}

function matchPattern(path: string, pattern: string | RegExp): boolean {
  if (pattern instanceof RegExp) return pattern.test(path)
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`).test(path)
}

function normalizePath(path: string): string {
  if (!path) return '/'
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`
  const compact = withLeadingSlash.replace(/\/{2,}/g, '/')
  if (compact !== '/' && compact.endsWith('/')) return compact.slice(0, -1)
  return compact
}

export function resolveRoutes(
  rawPaths: string[],
  options: SitemapOptions,
): SitemapRoute[] {
  const {
    hostname,
    changefreq,
    priority = 0.5,
    lastmod,
    exclude = [],
    include,
    locales,
    defaultLocale,
    transformUrl,
  } = options

  const lastmodStr =
    lastmod instanceof Date ? lastmod.toISOString().split('T')[0] : lastmod
  const baseUrl = hostname.replace(/\/+$/, '')
  const seen = new Set<string>()
  const routes: SitemapRoute[] = []

  function buildRoute(
    urlPath: string,
    alternates?: SitemapAlternate[],
  ): SitemapRoute | null {
    const fullUrl = `${baseUrl}${urlPath}`
    if (seen.has(fullUrl)) return null
    seen.add(fullUrl)

    let route: SitemapRoute = {
      url: fullUrl,
      ...(changefreq && { changefreq }),
      ...(lastmodStr && { lastmod: lastmodStr }),
      priority,
      ...(alternates?.length && { alternates }),
    }

    if (transformUrl) {
      const result = transformUrl(route)
      if (result === null || result === false) return null
      if (typeof result === 'string') route = { ...route, url: result }
      else if (result) route = result
    }

    return route
  }

  for (const rawPath of rawPaths) {
    const cleanPath = stripDynamicSegments(rawPath)
    const hasLocale = LOCALE_SEGMENT_RE.test(cleanPath)
    const canonicalPath = normalizePath(
      hasLocale ? cleanPath.replace(LOCALE_SEGMENT_GLOBAL_RE, '') : cleanPath,
    )

    if (include && !include.some((p) => matchPattern(canonicalPath, p))) continue
    if (exclude.some((p) => matchPattern(canonicalPath, p))) continue

    if (hasLocale && locales?.length) {
      const alternates: SitemapAlternate[] = locales.map((locale) => ({
        hreflang: locale,
        href: `${baseUrl}${normalizePath(cleanPath.replace(LOCALE_SEGMENT_GLOBAL_RE, locale))}`,
      }))

      if (defaultLocale) {
        alternates.push({
          hreflang: 'x-default',
          href: `${baseUrl}${normalizePath(cleanPath.replace(LOCALE_SEGMENT_GLOBAL_RE, defaultLocale))}`,
        })
      }

      const route = buildRoute(canonicalPath, alternates)
      if (route) routes.push(route)
    } else {
      const route = buildRoute(canonicalPath)
      if (route) routes.push(route)
    }
  }

  return routes
}

function generateSitemapXml(routes: SitemapRoute[]): string {
  const hasAlternates = routes.some((r) => r.alternates?.length)

  const urls = routes
    .map((route) => {
      const parts = [`    <loc>${escapeXml(route.url)}</loc>`]

      if (route.alternates?.length) {
        for (const alt of route.alternates) {
          parts.push(
            `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}"/>`,
          )
        }
      }

      if (route.lastmod) parts.push(`    <lastmod>${route.lastmod}</lastmod>`)
      if (route.changefreq)
        parts.push(`    <changefreq>${route.changefreq}</changefreq>`)
      if (route.priority != null)
        parts.push(`    <priority>${route.priority}</priority>`)

      return `  <url>\n${parts.join('\n')}\n  </url>`
    })
    .join('\n')

  const namespaces = [
    'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    ...(hasAlternates
      ? ['xmlns:xhtml="http://www.w3.org/1999/xhtml"']
      : []),
  ].join('\n         ')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset ${namespaces}>`,
    urls,
    '</urlset>',
    '',
  ].join('\n')
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function findRouteTreeFile(root: string): string | undefined {
  const candidates = [
    'routeTree.gen.ts',
    'src/routeTree.gen.ts',
    'app/routeTree.gen.ts',
  ]
  for (const candidate of candidates) {
    try {
      readFileSync(resolve(root, candidate), 'utf-8')
      return candidate
    } catch {
      // file not found, try next candidate
    }
  }
  return undefined
}

export default function sitemapPlugin(options: SitemapOptions): Plugin {
  let config: ResolvedConfig
  const fileName = options.fileName ?? 'sitemap.xml'

  return {
    name: 'vite-plugin-sitemap-tanstack-router',
    apply: 'build',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    generateBundle() {
      const root = config.root
      const routeTreeFile = options.routeTreeFile ?? findRouteTreeFile(root)

      if (!routeTreeFile) {
        config.logger.warn(
          '[sitemap] Could not find routeTree.gen.ts. Skipping sitemap generation.',
        )
        return
      }

      const filePath = resolve(root, routeTreeFile)
      let content: string
      try {
        content = readFileSync(filePath, 'utf-8')
      } catch {
        config.logger.warn(
          `[sitemap] Failed to read route tree file: ${filePath}`,
        )
        return
      }

      const rawPaths = parseRouteTree(content)
      if (rawPaths.length === 0) {
        config.logger.warn(
          '[sitemap] No routes found in route tree file. Skipping sitemap generation.',
        )
        return
      }

      const routes = resolveRoutes(rawPaths, options)

      if (options.extraRoutes) {
        for (const extra of options.extraRoutes) {
          if (typeof extra === 'string') {
            routes.push({
              url: `${options.hostname.replace(/\/+$/, '')}${extra}`,
              ...(options.changefreq && { changefreq: options.changefreq }),
              ...(options.lastmod && {
                lastmod:
                  options.lastmod instanceof Date
                    ? options.lastmod.toISOString().split('T')[0]
                    : options.lastmod,
              }),
              priority: options.priority ?? 0.5,
            })
          } else {
            routes.push(extra)
          }
        }
      }

      const xml = generateSitemapXml(routes)

      this.emitFile({
        type: 'asset',
        fileName,
        source: xml,
      })

      config.logger.info(
        `[sitemap] Generated ${fileName} with ${routes.length} URLs`,
      )
    },
  }
}

export { sitemapPlugin }
