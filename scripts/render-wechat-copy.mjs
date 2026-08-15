import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import MarkdownIt from 'markdown-it';

const input = process.argv[2] ?? 'content/dist/delivery-start/wechat.md';
const output = process.argv[3] ?? input.replace(/\.md$/, '-copy.html');
const source = fs.readFileSync(input, 'utf8');
const articleImagePath = path.join(path.dirname(input), 'assets', 'diagram-dev-iter-delivery.png');
const articleImageData = fs.existsSync(articleImagePath)
  ? `data:image/jpeg;base64,${fs.readFileSync(articleImagePath).toString('base64')}`
  : 'https://media.xiaolin.fun/docs/img-production-env/diagram-dev-iter-delivery.png';
const mermaidAsset = path.join(path.dirname(input), 'assets', 'nginx-request-flow.png');
const mermaidFlowImage = fs.existsSync(mermaidAsset)
  ? `data:image/png;base64,${fs.readFileSync(mermaidAsset).toString('base64')}`
  : '';
const body = source
  .replace(/^---[\s\S]*?---\n/, '')
  .replace(/^# 发布元数据[\s\S]*?^# 正文（粘贴到公众号后台）\n/m, '')
  .replace(/^---\n\n## 封面图（Codex 生成）[\s\S]*$/m, '')
  .replace(/```mermaid[\s\S]*?```\n?/g, mermaidFlowImage ? `<img src="${mermaidFlowImage}" alt="流程图" style="display:block;width:100%;height:auto;margin:20px 0;">` : '')
  .replace(/^完整版与延伸阅读.*\n\n?/m, '')
  .replace(/^关注 \*\*AI持续运维\*\*，.*\n\n?/m, '')
  .replace(/^不积跬步，无以至千里。\n\n?/m, '')
  .replace(/^## 搜索关键词（4 个）\n\n[^\n]+\n\n?/m, '')
  .replace(/^## 参考[\s\S]*?(?=^# 发布 checklist)/m, '')
  .replace(/^# 发布 checklist[\s\S]*$/m, '')
  .replace(/^## 封面图[\s\S]*$/m, '')
  .replace(/```text\n[\s\S]*?Welcome to nginx![\s\S]*?```\n?/m, '> **Welcome to nginx!**\n>\n> Nginx 已安装并正常运行。接下来还需要配置站点，才能代理你自己的静态资源。\n\n')
  .replace(/^# .*\n\n?/, '')
  .replace(/^# 正文（粘贴到公众号后台）\n/m, '')
  .replace(/^# .*\n\n?/, '')
  .trim();

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const normalizeFormula = (formula) => formula
  .replace(/\\xrightarrow(?:\{[^}]*\})+/g, ' → ')
  .replace(/\\Rightarrow/g, ' ⇒ ')
  .replace(/\\forall/g, '∀')
  .replace(/\\subseteq/g, '⊆')
  .replace(/\\times/g, '×')
  .replace(/\\in/g, '∈')
  .replace(/\\to/g, '→')
  .replace(/\\tau/g, 'τ')
  .replace(/\\q?quad/g, ' ')
  .replace(/\\text\{([^}]*)\}/g, '$1')
  .replace(/\\ldots/g, '…')
  .replace(/\\begin\{cases\}|\\end\{cases\}/g, '')
  .replace(/\\[;, :]/g, ' ')
  .replace(/\\([{}])/g, '$1')
  .replace(/\\&/g, '&')
  .replace(/\\\\/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const toWechatFormulaText = (formula) => normalizeFormula(formula)
  .replace(/\\longrightarrow/g, '→')
  .replace(/([A-Za-z])_([0-9A-Za-z]+)/g, (_, letter, subscript) => `${letter}${[...subscript].map((character) => ({ '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉', i:'ᵢ', n:'ₙ', j:'ⱼ', k:'ₖ', m:'ₘ', r:'ᵣ', s:'ₛ', x:'ₓ' }[character] ?? character)).join('')}`)
  .replace(/\\/g, '')
  .replace(/\s+/g, ' ')
  .trim();
const formulaHtmlText = (formula) => escapeHtml(toWechatFormulaText(formula))
  .replace(/([A-Za-z])([₀₁₂₃₄₅₆₇₈₉ᵢₙⱼₖₘᵣₛₓ]+)/g, (_, letter, subscript) => `${letter}<sub style="font-size:0.72em;line-height:0;vertical-align:-0.35em;">${subscript}</sub>`);
const formulaParts = (formula) => {
  const notes = [];
  const math = formula.trim()
    .replace(/\\text\{([^{}]*)\}/g, (_, note) => {
      notes.push(note.replace(/["“”]/g, ''));
      return ' ';
    })
    .replace(/\\xrightarrow(?:\{[^}]*\})+/g, '\\longrightarrow')
    .replace(/\\quad|\\qquad/g, ' ')
    .replace(/\\[,;:]/g, ' ')
    .replace(/&/g, ' ')
    .replace(/\\left|\\right/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { math, note: notes.join('') };
};
const compileFormula = (formula) => {
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wechat-formula-'));
    const tex = `\\documentclass[preview,border=8pt]{standalone}\n\\usepackage{amsmath,amssymb}\n\\begin{document}\n\\[${formula}\\]\n\\end{document}\n`;
    const texPath = path.join(dir, 'formula.tex');
    fs.writeFileSync(texPath, tex);
    execFileSync('latex', ['-interaction=nonstopmode', '-halt-on-error', '-output-directory', dir, texPath], { stdio: 'ignore' });
    const pngPath = path.join(dir, 'formula.png');
    execFileSync('dvipng', ['-D', '180', '-bg', 'Transparent', '-T', 'tight', '-o', pngPath, path.join(dir, 'formula.dvi')], { stdio: 'ignore' });
    return fs.readFileSync(pngPath).toString('base64');
  } catch {
    return '';
  }
};
const renderFormula = (formula) => {
  const text = toWechatFormulaText(formula);
  return `<p class="formula-block" style="margin:16px 0;padding:0;background:transparent;border:0;color:#0a152f;font-family:'STIX Two Math','Cambria Math',Georgia,'Times New Roman',serif;font-size:1em;line-height:1.6;overflow-wrap:anywhere;"><span style="display:block;box-sizing:border-box;margin:0;padding:9px 12px;text-align:center;background:#f7f9fc;border:1px solid #d9e2ec;border-radius:6px;color:#0a152f;font-family:'STIX Two Math','Cambria Math',Georgia,'Times New Roman',serif;font-size:1.05em;line-height:1.6;">${formulaHtmlText(formula)}</span></p>`;
  /* LaTeX 图片保留在代码中供后续网页预览实验使用，公众号复制稿不使用图片公式。 */
  const { math, note } = formulaParts(formula);
  if (formula.includes('\\begin{cases}')) {
    const rows = [...formula.matchAll(/([A-Za-z]+_?\d*)\s*&?\s*:\s*\\text\{([^}]*)\}/g)]
      .map(([, variable, text]) => `<div style="display:flex;gap:14px;margin:4px 0;"><span style="min-width:42px;font-family:Georgia,serif;font-size:24px;font-style:italic;color:#0a152f;">${escapeHtml(variable.replace(/_([0-9]+)/g, (_, n) => String.fromCharCode(0x2080 + Number(n))))}</span><span>${escapeHtml(text)}</span></div>`).join('');
    if (rows) return `<div style="margin:22px 0;padding:12px 20px;text-align:center;background:#f7f9fc;border:1px solid #d9e2ec;border-radius:6px;font-size:18px;line-height:1.7;">${rows}</div>`;
  }
  const svg = compileFormula(math);
  if (svg) return `<div style="margin:14px 0;padding:3px 6px;text-align:center;overflow-x:auto;line-height:1.45;"><img class="formula-image formula-block" src="data:image/png;base64,${svg}" alt="公式" style="display:inline-block;max-width:100%;height:1.15em;width:auto;vertical-align:-0.08em;">${note ? `<span style="margin-left:5px;font-size:0.92em;color:#243447;vertical-align:middle;">${escapeHtml(note)}</span>` : ''}</div>`;
  return `<div style="margin:22px 0;padding:12px 16px;text-align:center;background:#f7f9fc;border:1px solid #d9e2ec;border-radius:6px;color:#0a152f;font-size:18px;font-weight:600;line-height:1.8;">${escapeHtml(normalizeFormula(formula))}</div>`;
};
const renderInlineFormula = (formula) => {
  return `<span style="font-family:'STIX Two Math','Cambria Math',Georgia,'Times New Roman',serif;font-size:1.02em;color:#0a152f;white-space:normal;">${formulaHtmlText(formula)}</span>`;
};
const normalizedBody = body
  .replace(/https:\/\/media\.xiaolin\.fun\/docs\/img-production-env\/diagram-dev-iter-delivery\.png/g, articleImageData)
  .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, imagePath) => `![${alt}](${imagePath})`)
  .replace(/(?<!\!)\[([^\]]+)\]\((?:https?:\/\/|\.\/)[^)]+\)/g, '$1')
  .replace(/X\s*\\xrightarrow\{\\text\{突破\}\}\s*X'/g, 'X → X\'')
  .replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => renderFormula(formula) + '\n\n')
  .replace(/\$([^$\n]+)\$/g, (_, formula) => renderInlineFormula(formula));
const highlightCode = (source, language) => {
  source = source.replace(/[ \t]+(?=#)/g, '  ');
  const keywords = new Set((language === 'nginx' ? 'server listen root index location proxy_pass include server_name return' : 'sudo apt systemctl nginx npm npx pnpm mkdir cd cp curl export const let function if then fi').split(' '));
  const tokenPattern = /(#[^\n]*|<!--[\s\S]*?-->|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|<\/?[A-Za-z][^>]*>|\b\d+(?:\.\d+)?\b|[A-Za-z_][\w.-]*|\s+|.)/g;
  return [...source.matchAll(tokenPattern)].map(([token]) => {
    const safe = escapeHtml(token);
    if (/^\s+$/.test(token)) return token.replace(/ /g, '&nbsp;').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/\n/g, '<br>');
    if (/^(#|<!--)/.test(token)) return `<span style="color:#8a8f98;white-space:pre;display:inline;">${safe}</span>`;
    if (/^("|'|`)/.test(token)) return `<span style="color:#b45309;">${safe}</span>`;
    if (/^<\/?/.test(token)) return `<span style="color:#0f766e;">${safe}</span>`;
    if (/^\d/.test(token)) return `<span style="color:#7c3aed;">${safe}</span>`;
    if (keywords.has(token)) return `<span style="color:#175da4;font-weight:600;">${safe}</span>`;
    return safe;
  }).join('');
};
const md = new MarkdownIt({
  html: true,
  linkify: false,
  breaks: false,
  highlight: (source, language) => `<pre style="margin:16px 0;padding:12px 14px;overflow-x:auto;background:#f6f8fa;border:1px solid #e5e6eb;border-radius:5px;line-height:1.45;white-space:pre;"><code style="font-family:Menlo,Consolas,monospace;font-size:12px;white-space:pre;">${highlightCode(source, language)}</code></pre>`
});
md.renderer.rules.code_inline = (tokens, index) => `<code style="font-family:Menlo,Consolas,monospace;font-size:12px;white-space:nowrap;background:#f3f5f7;color:#175da4;padding:2px 4px;border-radius:3px;">${escapeHtml(tokens[index].content).replace(/ /g, '&nbsp;')}</code>`;
const renderedArticle = md.render(normalizedBody.replace(/^# [^\n]+\n+/, ''));
const articleHtml = renderedArticle.replace(/<ul>\s*([\s\S]*?)\s*<\/ul>/g, (_, items) => {
  const listItems = [...items.matchAll(/<li>([\s\S]*?)<\/li>/g)];
  const compactItems = listItems
    .map(([__, item], index) => `<p style="margin:0 0 ${index === listItems.length - 1 ? 0 : 4}px;padding-left:1.05em;text-indent:-1.05em;font-size:15px;line-height:1.6;letter-spacing:0;color:#222;">•&nbsp;${item.trim()}</p>`)
    .join('');
  return `<section style="margin:0 0 10px;">${compactItems}</section>`;
}).replace(/<ol>\s*([\s\S]*?)\s*<\/ol>/g, (_, items) => {
  const listItems = [...items.matchAll(/<li>([\s\S]*?)<\/li>/g)];
  const numberedItems = listItems
    .map(([__, item], index) => `<p style="margin:0 0 ${index === listItems.length - 1 ? 0 : 10}px;padding-left:1.55em;text-indent:-1.55em;font-size:15px;line-height:1.65;letter-spacing:0;color:#222;">${index + 1}.&nbsp;${item.trim()}</p>`)
    .join('');
  return `<section style="margin:0 0 10px;">${numberedItems}</section>`;
});
const title = source.match(/^1\.\s+(.+?)(?:（系列化）)?$/m)?.[1]?.trim() ?? 'AI持续运维';
const signatureImage = `data:image/png;base64,${fs.readFileSync('docs/public/images/wechat-theme/ai-ops-mascot.png').toString('base64')}`;
const brandHeader = `<img src="${signatureImage}" alt="AI持续运维品牌插图" style="display:block;width:100%;height:auto;margin:0 0 24px;">`;
const brandFooter = '<div style="margin-top:30px;padding:12px 0;border-top:1px solid #d9e2ec;color:#718096;font-size:13px;line-height:1.8;text-align:center;">这里可以插入你的公众号名片</div>';
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>
body{margin:0;background:#f3f6f9;color:#243447;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}.toolbar{position:sticky;top:0;z-index:2;padding:14px;text-align:center;background:#fff;border-bottom:1px solid #e8e8e8}.copy{border:0;border-radius:6px;padding:10px 22px;background:#175da4;color:#fff;font-size:15px;cursor:pointer}.hint{margin-left:12px;color:#888;font-size:13px}.article{box-sizing:border-box;max-width:760px;margin:24px auto;padding:38px 46px;background:#fff;line-height:1.95;font-size:16px;letter-spacing:.01em}.brand-header{display:flex;align-items:center;gap:12px;margin-bottom:18px;color:#0a152f}.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:12px 12px 12px 3px;background:#175da4;color:#fff;font-weight:800;letter-spacing:-1px}.brand-header strong{display:block;font-size:16px;letter-spacing:1px}.brand-header span{display:block;margin-top:2px;color:#718096;font-size:12px}.brand-rule{height:4px;margin-bottom:28px;background:#175da4}.brand-footer{margin-top:36px;padding:18px 0 0;border-top:1px solid #d9e2ec;color:#718096;font-size:13px;line-height:1.8}.brand-footer-mark{color:#175da4;font-size:16px;font-weight:700}.brand-slogan{margin-top:10px;color:#e27842}.article h1{font-size:28px;line-height:1.4;margin:0 0 28px;color:#0a152f}.article h2{margin:36px 0 16px;font-size:21px;line-height:1.5;border-left:4px solid #175da4;padding:7px 0 7px 12px;background:#f7f9fc;color:#0a152f}.article h3{font-size:17px;line-height:1.55;color:#175da4}.article p{margin:0 0 16px}.article blockquote{margin:20px 0;padding:12px 16px;border-left:4px solid #e27842;background:#fff8ed;color:#4b5563;line-height:1.8}.article pre{margin:18px 0;padding:14px 16px;overflow-x:auto;background:#f6f8fa;border:1px solid #e5e6eb;border-radius:5px;line-height:1.5;white-space:pre;font-size:12px}.article pre code{font-family:Menlo,Consolas,monospace;font-size:12px;white-space:pre}.article code{font-family:Menlo,Consolas,monospace;font-size:12px}.article img{max-width:100%;height:auto}.article table{border-collapse:collapse;width:100%;margin:18px 0;font-size:14px}.article th,.article td{border:1px solid #d9d9d9;padding:8px 10px;line-height:1.6}.article th{background:#f3f6f9;color:#0a152f}@media(max-width:600px){.article{margin:0;padding:26px 18px;font-size:16px}.article h1{font-size:25px}.article h2{font-size:20px}.hint{display:block;margin:8px 0 0}}
</style></head><body><div class="toolbar"><button class="copy" id="copy">一键复制正文</button><span class="hint" id="status">复制后粘贴到公众号编辑器</span></div><main class="article" id="article">${brandHeader}${articleHtml}${brandFooter}</main>
<script>function inlineWechatStyles(root){
const styles={h1:'font-size:28px;line-height:1.45;margin:0 0 24px;font-weight:700;color:#222;',h2:'font-size:22px;line-height:1.5;margin:32px 0 16px;padding-left:12px;border-left:4px solid #1677ff;color:#222;',h3:'font-size:18px;line-height:1.5;margin:24px 0 12px;color:#222;',p:'margin:0 0 16px;line-height:1.9;color:#222;',blockquote:'margin:18px 0;padding:10px 16px;border-left:4px solid #fa8c16;background:#fff7e6;color:#555;line-height:1.8;', 'blockquote code':'font-family:Menlo,Consolas,monospace;font-size:16px;font-weight:600;color:#0a152f;white-space:pre-wrap;',pre:'margin:16px 0;padding:14px;overflow:auto;background:#f6f8fa;border:1px solid #e5e6eb;border-radius:6px;line-height:1.6;white-space:pre;overflow-x:auto;font-size:12px;',code:'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;', 'pre code':'padding:0;background:transparent;white-space:pre;overflow-x:auto;font-size:12px;', 'p code':'padding:2px 5px;background:#f0f2f5;border-radius:3px;',table:'border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;', 'th,td':'border:1px solid #d9d9d9;padding:6px 10px;text-align:left;',th:'background:#fafafa;font-weight:600;',a:'color:#1677ff;text-decoration:none;',img:'max-width:100%;height:auto;display:block;margin:16px auto;'};
for(const [selector,style] of Object.entries(styles)){for(const node of root.querySelectorAll(selector)){if(!node.getAttribute('style'))node.setAttribute('style',style)}}
}
function copyRichText(){const source=document.getElementById('article');const clone=source.cloneNode(true);inlineWechatStyles(clone);const holder=document.createElement('div');holder.contentEditable='true';holder.style.cssText='position:fixed;left:-99999px;top:0;width:760px;background:#fff;';holder.innerHTML=clone.innerHTML;document.body.appendChild(holder);const range=document.createRange();range.selectNodeContents(holder);const sel=getSelection();sel.removeAllRanges();sel.addRange(range);let ok=false;try{ok=document.execCommand('copy')}catch(e){}sel.removeAllRanges();holder.remove();return ok}
document.getElementById('copy').addEventListener('click',()=>{const status=document.getElementById('status');if(copyRichText()){status.textContent='已复制富文本和代码块，可直接粘贴到公众号后台';}else{status.textContent='复制失败，请使用 Chrome 打开后重试';}});</script></body></html>`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(output);
