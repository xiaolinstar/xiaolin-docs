// 本篇候选稿入口：node content/dist/pipeline-basics/render-light.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import matter from 'gray-matter';
import assert from 'node:assert/strict';
import hljs from '../../../tools/md-wechat/node_modules/highlight.js/lib/core.js';
import bash from '../../../tools/md-wechat/node_modules/highlight.js/lib/languages/bash.js';
import groovy from '../../../tools/md-wechat/node_modules/highlight.js/lib/languages/groovy.js';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('groovy', groovy);

const dir = path.dirname(fileURLToPath(import.meta.url));
const { content, data } = matter(fs.readFileSync(path.join(dir, 'wechat-light.md'), 'utf8'));
const md = new MarkdownIt({ html: false, linkify: false, breaks: false });
const tokens = md.parse(content, {});
assert.equal(tokens[0].type, 'heading_open');
assert.equal(tokens[0].tag, 'h1');
const title = tokens[1].content;
const bodyTokens = tokens.slice(3);
const summary = '这一篇，我从 Docker 之后仍需手动执行的上线步骤出发，梳理 shell 脚本、任务依赖和流水线引擎的关系，再用 Jenkinsfile 说明如何把部署流程放进 Git，减少临场操作，同时保留对运行环境、失败处理和生产审批的必要判断。';
const styles = {
  p: 'margin:0 0 15px;font-size:15px;line-height:1.8;color:#333;text-align:left;word-wrap:break-word;',
  h2: 'width:100%;max-width:320px;margin:26px auto 16px;text-align:center;',
  h3: 'margin:20px 0 10px;font-size:15px;line-height:1.6;font-weight:700;color:#334e68;text-align:left;',
  ul: 'margin:0 0 15px;padding-left:24px;font-size:15px;line-height:1.8;color:#333;',
  ol: 'margin:0 0 15px;padding-left:28px;font-size:15px;line-height:1.8;color:#333;list-style-type:decimal;list-style-position:outside;',
  li: 'margin:0 0 8px;line-height:1.8;',
  strong: 'font-weight:700;color:#222;',
  code: 'font-family:Menlo,Consolas,monospace;font-size:14px;line-height:inherit;color:#334e68;background:#f3f4f5;padding:0 3px;border-radius:3px;white-space:normal;word-break:normal;overflow-wrap:anywhere;',
  codeBlock: 'box-sizing:border-box;max-width:100%;margin:16px 0;padding:12px 10px;background:#f7f7f7;border:0;text-align:left;font-family:Menlo,Consolas,monospace;font-size:13px;line-height:1.6;color:#333;white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;tab-size:2;',
  codeContent: 'font-family:Menlo,Consolas,monospace;font-size:13px;line-height:1.6;color:#333;white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;tab-size:2;',
};
const allowed = new Set(['paragraph_open', 'paragraph_close', 'heading_open', 'heading_close',
  'bullet_list_open', 'bullet_list_close', 'ordered_list_open', 'ordered_list_close', 'list_item_open', 'list_item_close', 'blockquote_open', 'blockquote_close', 'inline', 'fence']);
for (const token of bodyTokens) {
  assert(allowed.has(token.type), `本篇暂不支持：${token.type}`);
  if (token.type === 'heading_open') assert(['h2', 'h3'].includes(token.tag), '正文仅使用二、三级标题');
  for (const child of token.children ?? []) {
    assert(['text', 'softbreak', 'strong_open', 'strong_close', 'code_inline'].includes(child.type),
      `需要单独处理的行内元素：${child.type}`);
  }
  if (token.type === 'fence') {
    assert(token.content.trimEnd().split('\n').length <= 15, '代码块过长');
    assert(Math.max(...token.content.trimEnd().split('\n').map(line => [...line].length)) <= 72, '代码行过长');
  }
}
const esc = md.utils.escapeHtml;
const highlightColors = {
  keyword: '#005cc5', built_in: '#005cc5', literal: '#005cc5',
  string: '#a33a20', regexp: '#a33a20', comment: '#526b56', meta: '#526b56',
};
md.renderer.rules.fence = (ts, i) => {
  // 完整保留源代码中的空格、原始换行和末尾换行，折行仅由 CSS 控制。
  const token = ts[i];
  const language = token.info.trim().split(/\s+/)[0];
  const highlighted = hljs.getLanguage(language)
    ? hljs.highlight(token.content, { language, ignoreIllegals: true }).value
    : esc(token.content);
  // 只输出行内颜色，不依赖微信保留 class、外部样式或运行脚本。
  const code = highlighted.replace(/<span class="([^"]+)">/g, (_, classes) => {
    const kind = classes.split(/\s+/).find(c => c.startsWith('hljs-'))?.slice(5);
    return `<span style="color:${highlightColors[kind] ?? '#333'};">`;
  });
  const decoded = code.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#x27|#39);/g,
    (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#x27': "'", '#39': "'" })[entity]);
  assert.equal(decoded, token.content, '高亮改变了代码内容或缩进');
  return `<pre style="${styles.codeBlock}"><code style="${styles.codeContent}">${code}</code></pre>\n`;
};
// 候选方案：以普通段落承载小标题，Markdown 源文件继续保留标题语义。
let headingNumber = 0;
md.renderer.rules.heading_open = (ts, i) => {
  const tag = ts[i].tag;
  if (tag === 'h2') {
    const number = String(++headingNumber).padStart(2, '0');
    return `<section style="${esc(styles.h2)}"><p style="margin:0;text-align:center;line-height:1.4;"><span style="display:inline-block;margin-right:8px;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.15;font-weight:700;color:#175da4;text-align:center;">${number}</span><span style="display:inline-block;max-width:80%;vertical-align:middle;font-family:'PingFang SC','Heiti SC','Microsoft YaHei',sans-serif;font-size:15px;line-height:1.55;font-weight:700;color:#175da4;text-align:center;word-wrap:break-word;">`;
  }
  return `<p style="${styles.h3}"><strong style="font-weight:700;color:#334e68;">`;
};
md.renderer.rules.heading_close = (ts, i) => ts[i].tag === 'h2'
  ? '</span></p><section style="margin:3px 0 0;border-top:3px solid #b8c6cf;height:0;font-size:0;line-height:0;"></section></section>\n'
  : '</strong></p>\n';
md.renderer.rules.code_inline = (ts, i) => `<code style="${styles.code}">${esc(ts[i].content)}</code>`;
md.renderer.rules.blockquote_open = () => '<section style="box-sizing:border-box;margin:16px 0;padding:0 0 0 12px;border-left:3px solid #b8c6cf;">';
md.renderer.rules.blockquote_close = () => '</section>\n';
const originalRenderToken = md.renderer.renderToken.bind(md.renderer);
md.renderer.renderToken = (ts, i, options) => {
  if (ts[i].nesting === 1 && styles[ts[i].tag]) ts[i].attrSet('style', styles[ts[i].tag]);
  if (ts[i].type === 'paragraph_open' && ts[i - 1]?.type === 'blockquote_open') {
    ts[i].attrSet('style', 'margin:0;font-size:15px;line-height:1.8;color:#666;text-align:left;word-wrap:break-word;');
  }
  return originalRenderToken(ts, i, options);
};
const article = md.renderer.render(bodyTokens, md.options, {});
assert(!/发布元数据|发布 checklist|origin:|<h1|<img|<svg|<table|<a\s/.test(article));
for (const t of ['J₁', 'v₃', 'vᵢ → vⱼ', 'τ', '(1 − p)ⁿ', '95%', '${VERSION:?请设置 VERSION}', '${DB_URL:?请设置 DB_URL}', '>/dev/null 2>&1']) {
  assert(article.replace(/<span[^>]*>|<\/span>/g, '').includes(esc(t)), `代码内容丢失：${t}`);
}
const page = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{margin:0;background:#eee;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#333}.controls{max-width:720px;margin:20px auto;padding:20px;background:#fff}button{padding:10px 18px;cursor:pointer}textarea{display:block;box-sizing:border-box;width:100%;min-height:65px;margin:8px 0 16px;font:14px/1.6 sans-serif}.preview{box-sizing:border-box;width:100%;max-width:407px;margin:20px auto;padding:20px 16px;background:#fff}.preview section{min-width:0}#status{line-height:1.7;font-size:14px;color:#555}@media(max-width:430px){.preview{margin:0 auto}.controls{margin:0 auto}}</style></head>
<body><aside class="controls"><h1 style="font-size:20px">06 篇发布候选稿</h1><p>当前样式：第一批格式验收完成 · 引用块最终文字颜色 #666</p><p>本轮查看“执行与边界”末尾的短引用块：3px 灰蓝左线、15px 文字，无底色。本轮已从原文补回任务下标 J₁、节点 v₃、依赖箭头 →、拓扑序 τ，以及成功率 (1 − p)ⁿ、百分号等轻量文本；重点查看“把部署拆成 job 和 step”和“从串行步骤走向依赖图”。</p><p>行内代码采用 14px 等宽字、深蓝灰文字与浅灰底，不使用语法高亮；请检查中文混排、基线和换行。代码块样式保持不变。</p><p>代码采用完整 pre/code 结构，13px 等宽字体、行高 1.6、左右内边距 10px，长行只视觉折行；关键字深蓝、字符串棕红、注释深灰绿。请检查微信保存与手机预览后复制出的缩进、换行和特殊字符。</p><p>下方预览区域只有正文。标题、摘要分别填入后台对应字段；本稿无图片，无需逐张补图。第一批已使用格式均获用户确认；发布状态与原文链接配置单独检查。</p>
<label>标题<textarea readonly>${esc(title)}</textarea></label><label>摘要<textarea readonly>${esc(summary)}</textarea></label>
<label>后台原文链接（待配置并验证）<textarea readonly>${esc(data.origin_url)}</textarea></label><p>尾部已使用“阅读原文”引导，发布前请配置此链接并确认入口有效。</p>
<button id="copy">复制正文</button><p id="status" role="status">复制后在公众号正文区普通粘贴，勿选择“粘贴为纯文本”。</p></aside>
<main class="preview"><section id="article" style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;font-size:15px;line-height:1.8;color:#333;text-align:left;">${article}</section></main>
<script>
document.getElementById('copy').onclick=async()=>{
 const a=document.getElementById('article'),s=document.getElementById('status');
 const nativeCopy=()=>{const selection=getSelection(),r=document.createRange();r.selectNode(a);selection.removeAllRanges();selection.addRange(r);let ok=false;try{ok=document.execCommand('copy')}catch(e){}if(ok)selection.removeAllRanges();return ok};
 try{if(!navigator.clipboard||!window.ClipboardItem)throw Error('fallback');await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([a.outerHTML],{type:'text/html'}),'text/plain':new Blob([a.innerText],{type:'text/plain'})})]);s.textContent='正文已复制。请到微信粘贴、保存重开，再发送手机预览。'}
 catch(e){s.textContent=nativeCopy()?'正文已按原生方式复制，请到微信粘贴并检查。':'自动复制未成功，正文已选中，请按 Cmd/Ctrl+C 复制。'}
};
</script></body></html>`;
fs.writeFileSync(path.join(dir, 'wechat-light.html'), page);
console.log(JSON.stringify({ output: path.join(dir, 'wechat-light.html'), characters: content.length,
  codeBlocks: bodyTokens.filter(t => t.type === 'fence').length, images: 0, status: '待微信验收' }, null, 2));
