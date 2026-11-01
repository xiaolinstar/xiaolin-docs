// 本篇候选稿入口：node content/dist/pipeline-basics/render-light.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import matter from 'gray-matter';
import assert from 'node:assert/strict';

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
  h2: 'margin:26px 0 14px;font-size:18px;line-height:1.5;font-weight:700;color:#222;text-align:left;',
  ul: 'margin:0 0 15px;padding-left:24px;font-size:15px;line-height:1.8;color:#333;',
  li: 'margin:0 0 8px;line-height:1.8;',
  strong: 'font-weight:700;color:#222;',
  code: 'font-family:Menlo,Consolas,monospace;font-size:14px;color:#333;',
  pre: 'margin:18px 0;padding:12px;background:#f7f7f7;font-size:13px;line-height:1.65;white-space:pre-wrap;word-break:break-all;overflow-wrap:anywhere;color:#333;',
};
const allowed = new Set(['paragraph_open', 'paragraph_close', 'heading_open', 'heading_close',
  'bullet_list_open', 'bullet_list_close', 'list_item_open', 'list_item_close', 'inline', 'fence']);
for (const token of bodyTokens) {
  assert(allowed.has(token.type), `本篇暂不支持：${token.type}`);
  if (token.type === 'heading_open') assert.equal(token.tag, 'h2');
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
md.renderer.rules.fence = (ts, i) => `<pre style="${styles.pre}"><code style="${styles.code};font-size:13px;line-height:1.65;white-space:pre-wrap;word-break:break-all;">${esc(ts[i].content)}</code></pre>\n`;
md.renderer.rules.code_inline = (ts, i) => `<code style="${styles.code}">${esc(ts[i].content)}</code>`;
const originalRenderToken = md.renderer.renderToken.bind(md.renderer);
md.renderer.renderToken = (ts, i, options) => {
  if (ts[i].nesting === 1 && styles[ts[i].tag]) ts[i].attrSet('style', styles[ts[i].tag]);
  return originalRenderToken(ts, i, options);
};
const article = md.renderer.render(bodyTokens, md.options, {});
assert(!/发布元数据|发布 checklist|origin:|<h1|<img|<svg|<table|<a\s/.test(article));
for (const t of ['${VERSION:?请设置 VERSION}', '${DB_URL:?请设置 DB_URL}', '>/dev/null 2>&1']) {
  assert(article.includes(esc(t)), `代码内容丢失：${t}`);
}
const page = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{margin:0;background:#eee;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#333}.controls{max-width:720px;margin:20px auto;padding:20px;background:#fff}button{padding:10px 18px;cursor:pointer}textarea{display:block;box-sizing:border-box;width:100%;min-height:65px;margin:8px 0 16px;font:14px/1.6 sans-serif}.preview{box-sizing:border-box;width:100%;max-width:407px;margin:20px auto;padding:20px 16px;background:#fff}.preview section{min-width:0}#status{line-height:1.7;font-size:14px;color:#555}@media(max-width:430px){.preview{margin:0 auto}.controls{margin:0 auto}}</style></head>
<body><aside class="controls"><h1 style="font-size:20px">06 篇发布候选稿</h1><p>下方预览区域只有正文。标题、摘要分别填入后台对应字段；本稿无图片，无需逐张补图。尚未通过微信保存及手机预览验收。</p>
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
