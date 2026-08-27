import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const input = process.argv[2];
const output = process.argv[3] ?? input?.replace(/\.md$/, '-wechat.html');
if (!input || !output) throw new Error('用法：node scripts/render-wechat.mjs <origin.md> [output.html]');

const root = process.cwd();
let markdown = await fs.readFile(input, 'utf8');
const title = markdown.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? path.basename(input, '.md');
markdown = markdown.replace(/^---\n[\s\S]*?\n---\n?/, '');
if (!/^#\s/m.test(markdown)) markdown = `# ${title}\n\n${markdown}`;
markdown = markdown.replace(/!\[([^\]]*)\]\(\/images\/([^\)]+)\)/g, (_, alt, relative) => {
  const file = path.join(root, 'docs/public/images', relative);
  try {
    const bytes = fsSync.readFileSync(file);
    const ext = path.extname(file).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.gif' ? 'image/gif' : 'image/png';
    return `![${alt}](data:${mime};base64,${bytes.toString('base64')})`;
  } catch {
    return `![${alt}](/images/${relative})`;
  }
});

const temp = path.join('/tmp', `wechat-${process.pid}.md`);
await fs.writeFile(temp, markdown);
const { spawn } = await import('node:child_process');
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(root, 'scripts/render-wechat-native.mjs'), temp, path.resolve(output)], { stdio: 'inherit' });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`公众号渲染失败：${code}`)));
});
await fs.rm(temp, { force: true });
