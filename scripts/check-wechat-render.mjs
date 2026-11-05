#!/usr/bin/env node
// 公众号分发稿 LaTeX 数学公式产物形态校验
// 用法：
//   node scripts/check-wechat-render.mjs                        # 扫描 content/dist/*/*
//   node scripts/check-wechat-render.mjs content/dist/x/y       # 扫描指定文件

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const targets = process.argv.slice(2);
const collect = (entry) => {
  if (fs.statSync(entry).isFile()) return [entry];
  return fs.readdirSync(entry)
    .flatMap((child) => collect(path.join(entry, child)));
};
const files = targets.length
  ? targets.flatMap(collect)
  : fs.readdirSync('content/dist').flatMap((slug) => collect(path.join('content/dist', slug)));

const onlyRelevant = files.filter((f) => /\.(md|html)$/.test(f) && !/[\\/]node_modules[\\/]/.test(f));
let failed = 0;
const checked = { markdown: 0, html: 0 };
const origins = new Set();
for (const file of files) {
  if (path.basename(file) !== 'meta.yaml') continue;
  const { data } = matter(`---\n${fs.readFileSync(file, 'utf8')}\n---\n`);
  if (!data.origin || !fs.existsSync(data.origin)) {
    console.error(`✗ ${file}: Origin 文件不存在：${data.origin ?? '未填写'}`);
    failed++;
  }
  if (origins.has(data.origin)) {
    console.error(`✗ ${file}: 同一 Origin 对应多个分发目录。`);
    failed++;
  }
  origins.add(data.origin);
  if (data.origin && data.origin_url) {
    const expected = '/' + data.origin.replace(/^docs\//, '').replace(/\.md$/, '.html');
    let actual;
    try { actual = new URL(data.origin_url).pathname; } catch {}
    if (actual !== expected) {
      console.error(`✗ ${file}: origin_url 与 Origin 路径不一致。`);
      failed++;
    }
  }
}
for (const file of onlyRelevant) {
  if (file.endsWith('.html') && path.basename(file) !== 'wechat.html') {
    console.error(`✗ ${file}: 每篇只允许保留 wechat.html。`);
    failed++;
  }
}

const checkWechatMd = (file, body) => {
  // 已知非法转义模式：`$...\\to...$`、`$...\\{...\\}$`（\\ + 字母 / \\ + {）
  // 期望：inline 公式里应当只有 `\{` `\` `\{`、`\}` 这类单反斜杠转义
  const inlineDollar = body.match(/\$[^$\n]+?\$/g) ?? [];
  for (const expr of inlineDollar) {
    const inner = expr.slice(1, -1);
    if (/\\\\(to|times|rightarrow|leftarrow|neq|geq|leq|forall|exists|subset|in|cup|cap|text|quad|;|,|\||\{|\})/.test(inner)) {
      console.error(`✗ ${path.relative(process.cwd(), file)}: inline 公式含非法 \\ 转义：${expr}`);
      failed++;
    }
  }
};

const checkRenderHtml = (file, body) => {
  const escapedImg = (body.match(/&lt;img\s+src=/g) ?? []).length;
  if (escapedImg) {
    console.error(`✗ ${path.relative(process.cwd(), file)}: 检测到 ${escapedImg} 处 &lt;img 被错误转义（公式产物形态有破结构）`);
    failed++;
  }
  const rawXmlInParagraph = (body.match(/<p>[^<]*<\?xml/g) ?? []).length;
  if (rawXmlInParagraph) {
    console.error(`✗ ${path.relative(process.cwd(), file)}: 检测到 ${rawXmlInParagraph} 处 <p> 内出现 <?xml （SVG 字面泄露）`);
    failed++;
  }
  const fallbackCount = (body.match(/<span\s+style="display:inline;font-family:Georgia/g) ?? []).length;
  if (fallbackCount > 5) {
    console.error(`✗ ${path.relative(process.cwd(), file)}: 检测到 ${fallbackCount} 处 inline 公式走 fallback（多半为非法 LaTeX 源）`);
    failed++;
  }
  const aLinks = (body.match(/<a\b[^>]*href=/gi) ?? []).length;
  if (aLinks) {
    console.warn(`提示：${path.relative(process.cwd(), file)} 含 ${aLinks} 处链接，请在公众号预览中确认呈现。`);
  }
};

for (const file of onlyRelevant) {
  if (file.endsWith('.md') && /[\\/]wechat\.md$/.test(file)) {
    checked.markdown++;
    checkWechatMd(file, fs.readFileSync(file, 'utf8'));
  } else if (file.endsWith('.html') && /[\\/]wechat\.html$/.test(file)) {
    checked.html++;
    checkRenderHtml(file, fs.readFileSync(file, 'utf8'));
  }
}

console.log(`已检查 ${checked.markdown} 份 Markdown、${checked.html} 份正式 HTML。`);
if (!checked.html) {
  console.error('未找到正式 wechat.html，无法完成 HTML 校验。');
  failed++;
}
if (failed) {
  console.error(`\n共 ${failed} 处校验失败`);
  process.exit(1);
}
console.log('✓ 公众号分发稿产物形态校验通过');
