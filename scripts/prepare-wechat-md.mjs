import fs from 'node:fs/promises';
import path from 'node:path';

const input = process.argv[2];
const output = process.argv[3] ?? input?.replace(/\.md$/, '-wechat.md');
if (!input || !output) throw new Error('用法：node scripts/prepare-wechat-md.mjs <origin.md> [wechat.md]');

let source = await fs.readFile(input, 'utf8');
const title = source.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? path.basename(input, '.md');
source = source.replace(/^---\n[\s\S]*?\n---\n?/, '');
source = source.replace(/\{\{term:([^}]+)\}\}/g, '$1');
source = source.replace(/\[([^\]]+)\]\((?:\.\.?\/|[^)]*\.md)[^)]+\)/g, '$1');
source = source.replace(/\n:::\s*details[\s\S]*?\n:::\s*\n?/g, '\n');
source = source.replace(/```mermaid[\s\S]*?```\n?/g, '> 流程图已整理为正文信息图，公众号中直接阅读图片即可。\n\n');
source = source.replace(/^# 发布元数据[\s\S]*$/m, '').trim();
const body = `# ${title}\n\n${source}\n`;
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, body);
console.log(output);
