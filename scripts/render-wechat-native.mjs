import fs from 'node:fs/promises';
import path from 'node:path';
import MarkdownIt from 'markdown-it';

const input = process.argv[2];
const output = process.argv[3] ?? input?.replace(/\.md$/, '-wechat.html');
if (!input || !output) throw new Error('用法：node scripts/render-wechat-native.mjs <wechat.md> [output.html]');

const source = await fs.readFile(input, 'utf8');
const markdown = source.replace(/^---\n[\s\S]*?\n---\n?/, '');
// 普通换行不转换为 <br>。公众号会重新处理列表节点，保留 <br> 容易造成列表项被拆行。
const md = new MarkdownIt({ html: false, breaks: false, linkify: true });
let html = md.render(markdown);

const styles = {
  p: 'margin:14px 0;color:#333;font-size:16px;line-height:1.85;letter-spacing:0;',
  h1: 'margin:8px 0 28px;padding:0 0 12px;border-bottom:2px solid #f56700;color:#222;font-size:25px;line-height:1.45;text-align:center;font-weight:700;',
  h2: 'margin:30px 0 14px;padding:0 0 8px;border-bottom:2px solid #f56700;color:#222;font-size:20px;line-height:1.5;font-weight:700;',
  h3: 'margin:22px 0 10px;padding:0 0 0 9px;border-left:3px solid #f6a15c;color:#444;font-size:17px;line-height:1.55;font-weight:700;',
  // 行内命令必须作为一个整体换行，避免公众号把 mv 拆成孤立字符或把命令与后文拆开。
  code: 'display:inline-block;font-family:Menlo,Consolas,monospace;font-size:14px;color:#a64200;background:#f7f3ef;white-space:nowrap;word-break:keep-all;',
  pre: 'margin:16px 0;padding:14px 16px;background:#f7f7f7;border:1px solid #e5e5e5;color:#333;font-size:14px;line-height:1.7;white-space:pre-wrap;word-break:break-word;',
  blockquote: 'margin:18px 0;padding:8px 14px;border-left:2px solid #f6a15c;background:#fafafa;color:#555;',
  table: 'width:100%;margin:18px 0;border-collapse:collapse;font-size:14px;line-height:1.65;',
  th: 'padding:8px;border:1px solid #e5e5e5;background:#f7f7f7;color:#333;text-align:left;font-weight:700;',
  td: 'padding:8px;border:1px solid #e5e5e5;color:#333;text-align:left;vertical-align:top;',
  ul: 'margin:12px 0;padding-left:24px;color:#333;line-height:1.85;',
  ol: 'margin:12px 0;padding-left:24px;color:#333;line-height:1.85;',
  li: 'margin:5px 0;padding-left:2px;color:#333;line-height:1.85;',
  a: 'color:#576b95;text-decoration:none;',
  strong: 'color:#222;font-weight:700;',
  img: 'display:block;max-width:100%;height:auto;margin:16px auto;',
};

for (const [tag, style] of Object.entries(styles)) {
  const re = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
  html = html.replace(re, (_, attrs = '') => `<${tag} style="${style}">`);
}
html = html.replace(/<h([1-3]) style="([^"]*)">([\s\S]*?)<\/h\1>/gi, (_, level, style, content) =>
  `<section style="margin:0;"><p style="${style}">${content}</p></section>`
);
// Markdown-It 在宽松列表中会给 li 包一层 p；公众号粘贴时经常把它解析成额外段落。
html = html.replace(/<li style="([^"]*)">\s*<p style="[^"]*">([\s\S]*?)<\/p>\s*<\/li>/gi, '<li style="$1">$2</li>');
html = html.replace(/(<li style="[^"]*">)\s*<p style="[^"]*">/gi, '$1');
html = html.replace(/<\/p>(?=\s*(?:<section|<\/li>))/gi, '');
html = html.replace(/(<li style="[^"]*">[\s\S]*?)<\/p>(?=\s*<section)/gi, '$1');
// 表格中的短命令说明（如“mv 目录 + 重启”）按语义保持一行，避免被公众号拆成两行。
html = html.replace(/<td style="([^"]*)">(<code[^>]*>mv<\/code> 目录 \+ 重启)<\/td>/gi, '<td style="$1;white-space:nowrap;">$2</td>');
html = html.replace(/<pre style="([^"]*)">\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, preStyle, content) =>
  `<section style="${styles.pre}"><pre style="margin:0;background:transparent;border:0;padding:0;"><code style="${styles.code}">${content}</code></pre></section>`
);
html = html.replace(/\sclass="[^"]*"/gi, '').replace(/\sid="[^"]*"/gi, '');

const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? path.basename(input, '.md');
const page = `<!doctype html><html><head><meta charset="utf-8"><title>微信公众号文章</title></head><body style="margin:0;padding:0;background:#fff;"><div style="padding:10px;text-align:center;border-bottom:1px solid #eee;"><button id="copy-wechat" style="border:0;border-radius:4px;padding:9px 18px;background:#f56700;color:#fff;font-size:14px;">复制正文</button><span id="copy-status" style="margin-left:10px;color:#667085;font-size:13px;">点击后粘贴到微信公众号编辑器</span></div><section id="wechat-article" style="margin:0 auto;padding:18px 16px;max-width:760px;font-family:-apple-system-font,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Microsoft YaHei',Arial,sans-serif;color:#333;">${html}</section><script>document.getElementById('copy-wechat').onclick=async()=>{const a=document.getElementById('wechat-article'),s=document.getElementById('copy-status'),h=a.innerHTML,t=a.innerText;try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([h],{type:'text/html'}),'text/plain':new Blob([t],{type:'text/plain'})})]);s.textContent='已复制，打开公众号正文区粘贴'}catch(e){s.textContent='复制失败，请选中正文后按 Cmd/Ctrl+C'}};</script></body></html>`;
await fs.writeFile(output, page, 'utf8');
console.log(`[OK] 公众号原生 HTML 已生成：${output}`);
