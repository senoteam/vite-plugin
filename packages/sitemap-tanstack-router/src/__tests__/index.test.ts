import { describe, expect, it } from 'vitest'
import { parseRouteTree, resolveRoutes, stripDynamicSegments } from '../index'

const SAMPLE_ROUTE_TREE = `
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/{-$locale}': typeof Char123LocaleChar125IndexRoute
  '/{-$locale}/about': typeof Char123LocaleChar125AboutRoute
  '/{-$locale}/abouts/$id': typeof Char123LocaleChar125AboutsChar91idChar93Route
  '/{-$locale}/earn': typeof Char123LocaleChar125EarnIndexRoute
  '/{-$locale}/points-airdrop': typeof Char123LocaleChar125PointsAirdropIndexRoute
  '/{-$locale}/proof-of-reserves': typeof Char123LocaleChar125ProofOfReservesIndexRoute
  '/{-$locale}/trade/$': typeof Char123LocaleChar125TradeCenterTradeSplatRoute
  '/{-$locale}/mlp': typeof Char123LocaleChar125AuthMlpIndexRoute
  '/{-$locale}/msg': typeof Char123LocaleChar125AuthMsgIndexRoute
  '/{-$locale}/uc/instant-swap/record': typeof Char123LocaleChar125AuthUcInstantSwapRecordRoute
  '/{-$locale}/uc/instant-swap': typeof Char123LocaleChar125AuthUcInstantSwapIndexRoute
  '/{-$locale}/uc/portfolio': typeof Char123LocaleChar125AuthUcPortfolioIndexRoute
  '/{-$locale}/uc/records': typeof Char123LocaleChar125AuthUcRecordsIndexRoute
  '/{-$locale}/uc/reset': typeof Char123LocaleChar125AuthUcResetIndexRoute
  '/{-$locale}/uc/user-info': typeof Char123LocaleChar125AuthUcUserInfoIndexRoute
  '/{-$locale}/uc/withdrawal-address': typeof Char123LocaleChar125AuthUcWithdrawalAddressIndexRoute
}
`

describe('parseRouteTree', () => {
  it('should extract all paths from FileRoutesByTo', () => {
    const paths = parseRouteTree(SAMPLE_ROUTE_TREE)
    expect(paths).toContain('/')
    expect(paths).toContain('/{-$locale}')
    expect(paths).toContain('/{-$locale}/about')
    expect(paths).toContain('/{-$locale}/abouts/$id')
    expect(paths).toContain('/{-$locale}/earn')
    expect(paths).toHaveLength(17)
  })

  it('should return empty array for invalid content', () => {
    expect(parseRouteTree('')).toEqual([])
    expect(parseRouteTree('no interface here')).toEqual([])
  })

  it('should correctly parse keys containing braces', () => {
    const paths = parseRouteTree(SAMPLE_ROUTE_TREE)
    expect(paths).toContain('/{-$locale}')
    expect(paths).toContain('/{-$locale}/about')
    expect(paths).toContain('/{-$locale}/trade/$')
  })
})

describe('stripDynamicSegments', () => {
  it('should strip named params', () => {
    expect(stripDynamicSegments('/{-$locale}/abouts/$id')).toBe(
      '/{-$locale}/abouts',
    )
  })

  it('should strip splat routes', () => {
    expect(stripDynamicSegments('/{-$locale}/trade/$')).toBe(
      '/{-$locale}/trade',
    )
  })

  it('should handle root splat', () => {
    expect(stripDynamicSegments('/$')).toBe('/')
  })

  it('should not touch {-$locale} pattern', () => {
    expect(stripDynamicSegments('/{-$locale}/about')).toBe(
      '/{-$locale}/about',
    )
  })

  it('should leave paths without dynamic segments unchanged', () => {
    expect(stripDynamicSegments('/about')).toBe('/about')
    expect(stripDynamicSegments('/')).toBe('/')
  })
})

describe('resolveRoutes', () => {
  const paths = parseRouteTree(SAMPLE_ROUTE_TREE)

  it('should strip dynamic segments instead of filtering', () => {
    const routes = resolveRoutes(paths, {
      hostname: 'https://example.com',
      locales: ['en'],
    })
    const urls = routes.map((r) => r.url)
    expect(urls).toContain('https://example.com/abouts')
    expect(urls).toContain('https://example.com/trade')
    expect(urls.every((u) => !u.includes('$'))).toBe(true)
  })

  it('should keep one canonical loc for localized routes', () => {
    const routes = resolveRoutes(paths, {
      hostname: 'https://example.com',
      locales: ['en', 'zh-CN'],
    })
    const urls = routes.map((r) => r.url)
    expect(urls).toContain('https://example.com/about')
    expect(urls.filter((url) => url === 'https://example.com/about')).toHaveLength(1)
  })

  it('should generate xhtml:link alternates for each locale URL', () => {
    const routes = resolveRoutes(paths, {
      hostname: 'https://example.com',
      locales: ['en', 'zh-CN'],
    })
    const about = routes.find(
      (r) => r.url === 'https://example.com/about',
    )
    expect(about?.alternates).toHaveLength(2)
    expect(about?.alternates).toContainEqual({
      hreflang: 'en',
      href: 'https://example.com/en/about',
    })
    expect(about?.alternates).toContainEqual({
      hreflang: 'zh-CN',
      href: 'https://example.com/zh-CN/about',
    })
  })

  it('should add x-default alternate when defaultLocale is set', () => {
    const routes = resolveRoutes(paths, {
      hostname: 'https://example.com',
      locales: ['en', 'zh-CN'],
      defaultLocale: 'en',
    })
    const about = routes.find(
      (r) => r.url === 'https://example.com/about',
    )
    expect(about?.alternates).toContainEqual({
      hreflang: 'x-default',
      href: 'https://example.com/en/about',
    })
  })

  it('should include root route', () => {
    const routes = resolveRoutes(paths, {
      hostname: 'https://example.com',
      locales: ['en'],
    })
    const urls = routes.map((r) => r.url)
    expect(urls).toContain('https://example.com/')
  })

  it('should exclude routes matching exclude patterns', () => {
    const routes = resolveRoutes(paths, {
      hostname: 'https://example.com',
      locales: ['en'],
      exclude: ['*/earn'],
    })
    const urls = routes.map((r) => r.url)
    expect(urls.some((u) => u.includes('/earn'))).toBe(false)
  })

  it('should only include routes matching include patterns', () => {
    const routes = resolveRoutes(paths, {
      hostname: 'https://example.com',
      locales: ['en'],
      include: ['/', '*/about'],
    })
    const urls = routes.map((r) => r.url)
    expect(urls).toContain('https://example.com/')
    expect(urls).toContain('https://example.com/about')
    expect(urls).toHaveLength(2)
  })

  it('should apply transformUrl', () => {
    const routes = resolveRoutes(paths, {
      hostname: 'https://example.com',
      locales: ['en'],
      transformUrl: (route) => {
        if (route.url.includes('/points-airdrop')) return null
        return route
      },
    })
    const urls = routes.map((r) => r.url)
    expect(urls.some((u) => u.includes('/points-airdrop'))).toBe(false)
  })

  it('should set default priority and changefreq', () => {
    const routes = resolveRoutes(paths, {
      hostname: 'https://example.com',
      locales: ['en'],
      priority: 0.8,
      changefreq: 'weekly',
    })
    expect(routes[0].priority).toBe(0.8)
    expect(routes[0].changefreq).toBe('weekly')
  })

  it('should handle lastmod as Date', () => {
    const routes = resolveRoutes(paths, {
      hostname: 'https://example.com',
      locales: ['en'],
      lastmod: new Date('2026-01-15'),
    })
    expect(routes[0].lastmod).toBe('2026-01-15')
  })

  it('should generate canonical routes when locales is not set', () => {
    const routes = resolveRoutes(paths, {
      hostname: 'https://example.com',
    })
    const urls = routes.map((r) => r.url)
    expect(urls).toContain('https://example.com/')
    expect(urls).toContain('https://example.com/about')
    expect(urls.every((url) => !url.includes('/en/'))).toBe(true)
  })

  it('should deduplicate URLs from dynamic segment stripping', () => {
    const routes = resolveRoutes(paths, {
      hostname: 'https://example.com',
      locales: ['en'],
    })
    const urls = routes.map((r) => r.url)
    const unique = new Set(urls)
    expect(urls.length).toBe(unique.size)
  })
})
