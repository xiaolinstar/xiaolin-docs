import fs from 'node:fs';
import path from 'node:path';
import MarkdownIt from 'markdown-it';

const input = process.argv[2] ?? 'content/dist/delivery-start/wechat.md';
const output = process.argv[3] ?? input.replace(/\.md$/, '-copy.html');
const source = fs.readFileSync(input, 'utf8');
const mermaidFlowImage = `data:image/png;base64,${fs.readFileSync('content/dist/delivery-start/assets/nginx-request-flow.png').toString('base64')}`;
const body = source
  .replace(/^---[\s\S]*?---\n/, '')
  .replace(/^# 发布元数据[\s\S]*?^# 正文（粘贴到公众号后台）\n/m, '')
  .replace(/^---\n\n## 封面图（Codex 生成）[\s\S]*$/m, '')
  .replace(/```mermaid[\s\S]*?```\n?/g, `<img src="${mermaidFlowImage}" alt="Nginx 静态资源请求流程" style="display:block;width:100%;height:auto;margin:20px 0;">`)
  .replace(/^完整版与延伸阅读.*\n\n?/m, '')
  .replace(/^关注 \*\*AI持续运维\*\*，.*\n\n?/m, '')
  .replace(/^不积跬步，无以至千里。\n\n?/m, '')
  .replace(/^## 搜索关键词（4 个）\n\n[^\n]+\n\n?/m, '')
  .replace(/```text\n[\s\S]*?Welcome to nginx![\s\S]*?```\n?/m, '> **Welcome to nginx!**\n>\n> Nginx 已安装并正常运行。接下来还需要配置站点，才能代理你自己的静态资源。\n\n')
  .replace(/^# .*\n\n?/, '')
  .replace(/^# 正文（粘贴到公众号后台）\n/m, '')
  .replace(/^# .*\n\n?/, '')
  .trim();

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const highlightCode = (source, language) => {
  const keywords = new Set((language === 'nginx' ? 'server listen root index location proxy_pass include server_name return' : 'sudo apt systemctl nginx npm npx pnpm mkdir cd cp curl export const let function if then fi').split(' '));
  const tokenPattern = /(#[^\n]*|<!--[\s\S]*?-->|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|<\/?[A-Za-z][^>]*>|\b\d+(?:\.\d+)?\b|[A-Za-z_][\w.-]*|\s+|.)/g;
  return [...source.matchAll(tokenPattern)].map(([token]) => {
    const safe = escapeHtml(token);
    if (/^\s+$/.test(token)) return token.replace(/ /g, '&nbsp;').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/\n/g, '<br>');
    if (/^(#|<!--)/.test(token)) return `<span style="color:#8a8f98;">${safe}</span>`;
    if (/^("|'|`)/.test(token)) return `<span style="color:#b45309;">${safe}</span>`;
    if (/^<\/?/.test(token)) return `<span style="color:#0f766e;">${safe}</span>`;
    if (/^\d/.test(token)) return `<span style="color:#7c3aed;">${safe}</span>`;
    if (keywords.has(token)) return `<span style="color:#175da4;font-weight:600;">${safe}</span>`;
    return safe;
  }).join('');
};
const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
  highlight: (source, language) => `<pre style="margin:16px 0;padding:12px 14px;overflow-x:auto;background:#f6f8fa;border:1px solid #e5e6eb;border-radius:5px;line-height:1.45;white-space:pre;"><code style="font-family:Menlo,Consolas,monospace;font-size:12px;white-space:pre;">${highlightCode(source, language)}</code></pre>`
});
md.renderer.rules.code_inline = (tokens, index) => `<code style="font-family:Menlo,Consolas,monospace;font-size:12px;white-space:pre;">${escapeHtml(tokens[index].content).replace(/ /g, '&nbsp;')}</code>`;
const renderedArticle = md.render(body.replace(/^# [^\n]+\n+/, ''));
const articleHtml = renderedArticle.replace(/<ul>\s*([\s\S]*?)\s*<\/ul>/g, (_, items) => {
  const compactItems = [...items.matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map(([__, item]) => `<p style="margin:0 0 6px;padding-left:1em;text-indent:-1em;line-height:1.7;">• ${item.trim()}</p>`)
    .join('');
  return `<div style="margin:0 0 14px;">${compactItems}</div>`;
});
const title = 'DevOps 基础 01 ｜ Nginx 静态资源代理';
const signatureImage = `data:image/png;base64,${fs.readFileSync('docs/public/images/wechat-theme/ai-ops-mascot.png').toString('base64')}`;
const brandHeader = `<img src="${signatureImage}" alt="AI持续运维品牌插图" style="display:block;width:100%;height:auto;margin:0 0 24px;">`;
const brandFooter = '<div style="margin-top:30px;padding:12px 0;border-top:1px solid #d9e2ec;color:#718096;font-size:13px;line-height:1.8;text-align:center;">这里可以插入你的公众号名片</div>';
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>
body{margin:0;background:#f5f6f7;color:#222;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}.toolbar{position:sticky;top:0;padding:14px;text-align:center;background:#fff;border-bottom:1px solid #e8e8e8}.copy{border:0;border-radius:6px;padding:10px 22px;background:#175da4;color:#fff;font-size:15px;cursor:pointer}.hint{margin-left:12px;color:#888;font-size:13px}.article{box-sizing:border-box;max-width:760px;margin:24px auto;padding:36px 42px;background:#fff;line-height:1.9;font-size:16px}.brand-header{display:flex;align-items:center;gap:12px;margin-bottom:18px;color:#0a152f}.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:12px 12px 12px 3px;background:#175da4;color:#fff;font-weight:800;letter-spacing:-1px}.brand-header strong{display:block;font-size:16px;letter-spacing:1px}.brand-header span{display:block;margin-top:2px;color:#718096;font-size:12px}.brand-rule{height:4px;margin-bottom:28px;background:#175da4}.brand-footer{margin-top:36px;padding:18px 0 0;border-top:1px solid #d9e2ec;color:#718096;font-size:13px;line-height:1.8}.brand-footer-mark{color:#175da4;font-size:16px;font-weight:700}.brand-slogan{margin-top:10px;color:#e27842}.article h1{font-size:26px;line-height:1.35}.article h2{margin-top:32px;font-size:21px;border-left:4px solid #175da4;padding-left:12px}.article h3{font-size:17px}.article blockquote{margin:18px 0;padding:8px 16px;border-left:4px solid #e27842;background:#fff7e6;color:#555}.article pre{margin:16px 0;padding:12px 14px;overflow-x:auto;background:#f6f8fa;border:1px solid #e5e6eb;border-radius:5px;line-height:1.45;white-space:pre;font-size:12px}.article pre code{font-family:Menlo,Consolas,monospace;font-size:12px;white-space:pre}.article code{font-family:Menlo,Consolas,monospace;font-size:12px}.article img{max-width:100%;height:auto}.article table{border-collapse:collapse;width:100%}.article th,.article td{border:1px solid #d9d9d9;padding:6px 10px}.article th{background:#fafafa}@media(max-width:600px){.article{margin:0;padding:24px 18px}.hint{display:block;margin:8px 0 0}}
</style></head><body><div class="toolbar"><button class="copy" id="copy">一键复制正文</button><span class="hint" id="status">复制后粘贴到公众号编辑器</span></div><main class="article" id="article">${brandHeader}${articleHtml}${brandFooter}</main>
<script>function inlineWechatStyles(root){const styles={h1:'font-size:28px;line-height:1.45;margin:0 0 24px;font-weight:700;color:#222;',h2:'font-size:22px;line-height:1.5;margin:32px 0 16px;padding-left:12px;border-left:4px solid #1677ff;color:#222;',h3:'font-size:18px;line-height:1.5;margin:24px 0 12px;color:#222;',p:'margin:0 0 16px;line-height:1.9;color:#222;',blockquote:'margin:18px 0;padding:10px 16px;border-left:4px solid #fa8c16;background:#fff7e6;color:#555;line-height:1.8;',pre:'margin:16px 0;padding:14px;overflow:auto;background:#f6f8fa;border:1px solid #e5e6eb;border-radius:6px;line-height:1.6;white-space:pre;overflow-x:auto;font-size:12px;',code:'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;', 'pre code':'padding:0;background:transparent;white-space:pre;overflow-x:auto;font-size:12px;', 'p code':'padding:2px 5px;background:#f0f2f5;border-radius:3px;',table:'border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;', 'th,td':'border:1px solid #d9d9d9;padding:6px 10px;text-align:left;',th:'background:#fafafa;font-weight:600;',ul:'margin:0 0 14px;padding-left:22px;line-height:1.6;',ol:'margin:0 0 14px;padding-left:22px;line-height:1.6;',li:'display:list-item;margin:0 0 4px;line-height:1.6;',a:'color:#1677ff;text-decoration:none;',img:'max-width:100%;height:auto;display:block;margin:16px auto;'};for(const [selector,style] of Object.entries(styles)){for(const node of root.querySelectorAll(selector))node.setAttribute('style',style)}}
function copyRichText(){const source=document.getElementById('article');const clone=source.cloneNode(true);inlineWechatStyles(clone);const holder=document.createElement('div');holder.contentEditable='true';holder.style.cssText='position:fixed;left:-99999px;top:0;width:760px;background:#fff;';holder.innerHTML=clone.innerHTML;document.body.appendChild(holder);const range=document.createRange();range.selectNodeContents(holder);const sel=getSelection();sel.removeAllRanges();sel.addRange(range);let ok=false;try{ok=document.execCommand('copy')}catch(e){}sel.removeAllRanges();holder.remove();return ok}
document.getElementById('copy').addEventListener('click',()=>{const status=document.getElementById('status');if(copyRichText()){status.textContent='已复制富文本和代码块，可直接粘贴到公众号后台';}else{status.textContent='复制失败，请使用 Chrome 打开后重试';}});</script></body></html>`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(output);
