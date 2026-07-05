const fs = require('fs')
const path = require('path')

const docsDir = path.join(__dirname, '../docs')

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!frontmatterMatch) return false

  const titleMatch = frontmatterMatch[1].match(/^title:\s*(.+)$/m)
  if (!titleMatch) return false

  let title = titleMatch[1].trim()
  title = title.replace(/^['"](.*)['"]$/, '$1')

  const contentAfterFrontmatter = content.slice(frontmatterMatch[0].length)
  const lines = contentAfterFrontmatter.split('\n')

  const firstNonEmptyIndex = lines.findIndex(line => line.trim() !== '')
  if (firstNonEmptyIndex === -1) return false

  const trimmedLine = lines[firstNonEmptyIndex].trim()
  if (trimmedLine.startsWith('# ') && trimmedLine.slice(2) === title) {
    const newLines = lines.slice(0, firstNonEmptyIndex).concat(lines.slice(firstNonEmptyIndex + 1))
    const newContent = content.slice(0, frontmatterMatch[0].length) + newLines.join('\n')
    fs.writeFileSync(filePath, newContent)
    return true
  }

  return false
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir)
  let count = 0

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      count += traverseDir(filePath)
    } else if (file.endsWith('.md')) {
      if (processFile(filePath)) {
        console.log(`Removed duplicate H1: ${filePath}`)
        count++
      }
    }
  }

  return count
}

const total = traverseDir(docsDir)
console.log(`\nTotal files processed: ${total}`)