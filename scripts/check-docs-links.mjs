import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const docsDir = path.join(root, 'docs')
const publicDir = path.join(docsDir, 'public')
const configFile = path.join(docsDir, '.vitepress', 'config.mts')

const configContent = fs.readFileSync(configFile, 'utf8')
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('//'))
  .join('\n')
// 与站点 srcExclude 保持一致，历史审计快照不属于发布页面。
const excludeBlock = configContent.match(/srcExclude:\s*\[([\s\S]*?)\]/)?.[1] ?? ''
const excludedPatterns = [...excludeBlock.matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1])

const ignoreSchemes = /^(https?:|mailto:|tel:|javascript:|data:)/
const assetExts = new Set([
  '.avif', '.gif', '.ico', '.jpeg', '.jpg', '.md', '.pdf', '.png', '.svg', '.txt', '.webp'
])

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    const relative = path.relative(docsDir, fullPath)
    if (excludedPatterns.some(pattern => path.matchesGlob(relative, pattern) || (entry.isDirectory() && path.matchesGlob(`${relative}/index.md`, pattern)))) return []
    if (entry.isDirectory()) {
      if (fullPath.includes(`${path.sep}.vitepress${path.sep}`) || fullPath === publicDir) return []
      return walk(fullPath)
    }
    return entry.isFile() && entry.name.endsWith('.md') ? [fullPath] : []
  })
}

function stripTarget(target) {
  return target.split('#')[0].split('?')[0]
}

function routeExists(route) {
  const target = stripTarget(route)
  if (!target || target === '/') return fs.existsSync(path.join(docsDir, 'index.md'))
  const normalized = target.startsWith('/') ? target.slice(1) : target
  const ext = path.extname(normalized)

  if (assetExts.has(ext)) {
    return fs.existsSync(path.join(publicDir, normalized)) || fs.existsSync(path.join(docsDir, normalized))
  }

  return fs.existsSync(path.join(docsDir, `${normalized}.md`))
    || fs.existsSync(path.join(docsDir, normalized, 'index.md'))
}

function localTargetExists(sourceFile, target) {
  const cleanTarget = stripTarget(target)
  if (!cleanTarget || cleanTarget.startsWith('#')) return true
  if (ignoreSchemes.test(cleanTarget)) return true
  if (cleanTarget.startsWith('/')) return routeExists(cleanTarget)

  const resolved = path.resolve(path.dirname(sourceFile), cleanTarget)
  const ext = path.extname(resolved)
  if (assetExts.has(ext)) return fs.existsSync(resolved)
  return fs.existsSync(`${resolved}.md`) || fs.existsSync(path.join(resolved, 'index.md')) || fs.existsSync(resolved)
}

const errors = []

for (const file of walk(docsDir)) {
  const content = fs.readFileSync(file, 'utf8')
  const linkPattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g
  for (const match of content.matchAll(linkPattern)) {
    const target = match[1].trim()
    if (!localTargetExists(file, target)) errors.push(`${path.relative(root, file)} -> ${target}`)
  }
}

const configLinkPattern = /link:\s*[`'"]([^`'"]+)[`'"]/g
for (const match of configContent.matchAll(configLinkPattern)) {
  const target = match[1].trim()
  if (ignoreSchemes.test(target)) continue
  if (!target.startsWith('/')) {
    errors.push(`docs/.vitepress/config.mts -> ${target}（导航链接必须以 / 开头）`)
    continue
  }
  if (!routeExists(target)) errors.push(`docs/.vitepress/config.mts -> ${target}`)
}

if (errors.length > 0) {
  console.error('发现失效的本地链接：')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('本地文档链接检查通过。')
