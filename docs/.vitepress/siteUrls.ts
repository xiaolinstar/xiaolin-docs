const productionOrigin = 'https://www.xiaolinstar.cn'

export function canonicalUrl(relativePath: string): string {
  const route = relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '.html')
  return new URL(route, productionOrigin + '/').href
}

export function markdownSourceUrl(route: string, base: string): string {
  let pathname = route.split(/[?#]/)[0]
  if (base !== '/' && pathname.startsWith(base)) pathname = '/' + pathname.slice(base.length)
  pathname = pathname.replace(/\.html$/, '')
  // llms 插件把目录 index.md 输出为同名目录的 .md 文件。
  if (pathname.endsWith('/')) pathname = pathname.slice(0, -1)
  pathname = pathname.replace(/\/index$/, '')
  return new URL((pathname || '/index') + '.md', productionOrigin).href
}
