// 正式稿入口：node content/dist/pipeline-basics/render-wechat.mjs
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
const { content, data } = matter(fs.readFileSync(path.join(dir, 'wechat.md'), 'utf8'));
const md = new MarkdownIt({ html: false, linkify: false, breaks: false });
const tokens = md.parse(content, {});
// 抬头图：H1 之前的纯视觉鸟图，不参与标题与图注渲染
let headTokens = [];
let bodyStart = 0;
if (tokens[0].type === 'paragraph_open' && tokens[1]?.type === 'inline'
  && tokens[1].children?.length === 1 && tokens[1].children[0].type === 'image') {
  headTokens = tokens.slice(0, 3);
  bodyStart = 3;
}
assert(headTokens.length, '缺少开头抬头图');
assert.equal(tokens[bodyStart].type, 'heading_open');
assert.equal(tokens[bodyStart].tag, 'h1');
const title = tokens[bodyStart + 1].content;
const bodyTokens = [...headTokens, ...tokens.slice(bodyStart + 3)];
const summary = '这一篇，我从 Docker 之后仍需手动执行的上线步骤出发，梳理 shell 脚本、任务依赖和流水线引擎的关系，再用 Jenkinsfile 说明如何把部署流程放进 Git。我的目标是减少临场操作，同时保留对运行环境、失败处理和生产审批的必要判断。';
const styles = {
  p: 'margin:0 0 15px;font-size:15px;line-height:1.8;color:#333;text-align:left;word-wrap:break-word;',
  h2: 'width:100%;max-width:320px;margin:26px auto 16px;text-align:center;',
  h3: 'margin:20px 0 10px;font-size:15px;line-height:1.6;font-weight:700;color:#334e68;text-align:left;',
  ul: 'margin:0 0 15px;padding-left:24px;font-size:15px;line-height:1.8;color:#333;',
  ol: 'margin:0 0 15px;padding-left:28px;font-size:15px;line-height:1.8;color:#333;list-style-type:decimal;list-style-position:outside;',
  li: 'margin:0 0 8px;line-height:1.8;',
  strong: 'font-weight:700;color:#222;',
  table: 'box-sizing:border-box;width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse;margin:16px 0;font-size:14px;line-height:1.7;color:#333;',
  th: 'box-sizing:border-box;border:1px solid #dce2e8;padding:8px;text-align:left;vertical-align:top;background:#f3f5f7;font-size:14px;line-height:1.7;font-weight:700;overflow-wrap:anywhere;',
  td: 'box-sizing:border-box;border:1px solid #dce2e8;padding:8px;text-align:left;vertical-align:top;background:#fff;font-size:14px;line-height:1.7;overflow-wrap:anywhere;',
  code: 'font-family:Menlo,Consolas,monospace;font-size:14px;line-height:inherit;color:#334e68;background:#f3f4f5;padding:0 3px;border-radius:3px;white-space:normal;word-break:normal;overflow-wrap:anywhere;',
  codeBlock: 'box-sizing:border-box;max-width:100%;margin:16px 0;padding:12px 10px;background:#f7f7f7;border:0;text-align:left;font-family:Menlo,Consolas,monospace;font-size:13px;line-height:1.6;color:#333;white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;tab-size:2;',
  codeContent: 'font-family:Menlo,Consolas,monospace;font-size:13px;line-height:1.6;color:#333;white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;tab-size:2;',
};
const allowed = new Set(['paragraph_open', 'paragraph_close', 'heading_open', 'heading_close',
  'bullet_list_open', 'bullet_list_close', 'ordered_list_open', 'ordered_list_close', 'list_item_open', 'list_item_close', 'blockquote_open', 'blockquote_close', 'inline', 'fence', 'hr',
  'table_open', 'table_close', 'thead_open', 'thead_close', 'tbody_open', 'tbody_close',
  'tr_open', 'tr_close', 'th_open', 'th_close', 'td_open', 'td_close']);
for (const token of bodyTokens) {
  assert(allowed.has(token.type), `本篇暂不支持：${token.type}`);
  if (token.type === 'heading_open') assert(['h2', 'h3'].includes(token.tag), '正文仅使用二、三级标题');
  for (const child of token.children ?? []) {
    assert(['text', 'softbreak', 'strong_open', 'strong_close', 'code_inline', 'image'].includes(child.type),
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
md.renderer.rules.image = (ts, i) => {
  const token = ts[i];
  const src = token.attrGet('src');
  const caption = token.content;
  const sizes = {
    'https://media.xiaolin.fun/docs/img-pipeline-basics/infographic-traditional-ops.png': [1672, 941],
    'https://media.xiaolin.fun/docs/img-pipeline-basics/infographic-shell-flow-vs-dag.png': [1672, 941],
    'https://media.xiaolin.fun/docs/img-pipeline-basics/wechat-dag-v1.png': [1025, 1500],
    'https://media.xiaolin.fun/docs/wechat-theme/ai-ops-mascot.png': [1905, 826],
  };
  assert(sizes[src], '图片超出本轮已评审范围');
  const [width, height] = sizes[src];
  const isDag = src.endsWith('/wechat-dag-v1.png');
  const isHead = src.endsWith('/ai-ops-mascot.png');
  const displayWidth = isDag ? '218px' : '100%';
  assert([...caption].length <= 40, '图注超出 SLA，停止转换并共同评审');
  // 抬头图为纯视觉元素，不输出图注
  if (isHead) {
    return `<img width="${width}" height="${height}" loading="eager" referrerpolicy="no-referrer" src="${esc(src)}" alt="${esc(caption)}" style="display:block;box-sizing:border-box;width:100%;max-width:100%;height:auto;margin:0 auto 16px;">`;
  }
  return `<img width="${width}" height="${height}" loading="eager" referrerpolicy="no-referrer" src="${esc(src)}" alt="${esc(caption)}" style="display:block;box-sizing:border-box;width:${displayWidth};max-width:100%;height:auto;margin:0 auto 6px;"><span style="display:block;font-size:13px;line-height:1.6;color:#666;text-align:center;">${esc(caption)}</span>`;
};
md.renderer.rules.code_inline = (ts, i) => `<code style="${styles.code}">${esc(ts[i].content)}</code>`;
md.renderer.rules.blockquote_open = () => '<section style="box-sizing:border-box;margin:16px 0;padding:0 0 0 12px;border-left:3px solid #b8c6cf;">';
md.renderer.rules.blockquote_close = () => '</section>\n';
md.renderer.rules.hr = () => '<section style="box-sizing:border-box;width:100%;height:0;margin:16px 0;border:0;border-top:1px solid #dce2e8;font-size:0;line-height:0;"></section>\n';
// 仅在列表中替换加粗标签，不影响第一批正文加粗。
let listDepth = 0;
let inReferences = false;
let referenceNumber = 0;
for (let i = 0; i < bodyTokens.length; i++) {
  const token = bodyTokens[i];
  if (['bullet_list_open', 'ordered_list_open'].includes(token.type)) listDepth++;
  if (['bullet_list_close', 'ordered_list_close'].includes(token.type)) listDepth--;
  if (token.type === 'heading_open') inReferences = bodyTokens[i + 1]?.content === '参考资料';
  if (token.type !== 'inline') continue;
  if (listDepth) for (const child of token.children ?? []) {
    if (['strong_open', 'strong_close'].includes(child.type)) child.meta = { listBold: true };
  }
  const ref = inReferences && token.content.match(/^(.+?)：(https:\/\/\S+)$/);
  if (ref) {
    assert(++referenceNumber <= 5 && [...ref[1]].length <= 24 && ref[2].length <= 120,
      '参考资料超出 SLA，停止转换并共同评审');
    token.meta = { reference: { number: referenceNumber, title: ref[1], url: ref[2] } };
    token.children[0].meta = token.meta;
  }
}
md.renderer.rules.strong_open = (ts, i, options) => ts[i].meta?.listBold
  ? '<span style="display:inline;font-weight:700;color:#222;">'
  : md.renderer.renderToken(ts, i, options);
md.renderer.rules.strong_close = (ts, i, options) => ts[i].meta?.listBold
  ? '</span>' : md.renderer.renderToken(ts, i, options);
const originalRenderInline = md.renderer.renderInline.bind(md.renderer);
md.renderer.renderInline = (ts, options, env) => {
  const ref = ts[0]?.meta?.reference;
  if (!ref) return originalRenderInline(ts, options, env);
  return `<span style="font-size:13px;font-weight:400;color:#555;">[${ref.number}] ${esc(ref.title)}</span><br><span style="font-size:13px;font-weight:400;color:#666;word-break:normal;overflow-wrap:anywhere;">${esc(ref.url)}</span>`;
};
const originalRenderToken = md.renderer.renderToken.bind(md.renderer);
md.renderer.renderToken = (ts, i, options) => {
  if (ts[i].nesting === 1 && styles[ts[i].tag]) ts[i].attrSet('style', styles[ts[i].tag]);
  if (['th_open', 'td_open'].includes(ts[i].type)) {
    const rowStart = ts.slice(0, i).findLastIndex(t => t.type === 'tr_open');
    const column = ts.slice(rowStart, i).filter(t => ['th_open', 'td_open'].includes(t.type)).length;
    ts[i].attrSet('style', styles[ts[i].tag] + (column === 0 ? 'width:36%;' : 'width:64%;'));
  }
  if (ts[i].type === 'paragraph_open' && ts[i + 1]?.children?.some(t => t.type === 'image')) {
    ts[i].attrSet('style', 'margin:16px 0;padding:0;text-align:center;');
  }
  if (ts[i].type === 'paragraph_open' && ts[i + 1]?.meta?.reference) {
    ts[i].attrSet('style', 'margin:0 0 8px;font-size:13px;line-height:1.6;color:#555;text-align:left;word-wrap:break-word;');
  }
  if (ts[i].type === 'paragraph_open' && ts[i - 1]?.type === 'blockquote_open') {
    ts[i].attrSet('style', 'margin:0;font-size:15px;line-height:1.8;color:#666;text-align:left;word-wrap:break-word;');
  }
  return originalRenderToken(ts, i, options);
};
const article = md.renderer.render(bodyTokens, md.options, {});
assert(!/发布元数据|发布 checklist|origin:|<h1|<svg|<a\s/.test(article));
for (const t of ['J₁', 'v₃', 'vᵢ → vⱼ', 'τ', '(1 − p)ⁿ', '95%', '${VERSION:?VERSION is required}', '${DB_URL:?DB_URL is required}', '>/dev/null 2>&1']) {
  assert(article.replace(/<span[^>]*>|<\/span>/g, '').includes(esc(t)), `代码内容丢失：${t}`);
}
const page = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{margin:0;background:#eee;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#333}.controls{max-width:720px;margin:20px auto;padding:20px;background:#fff}button{padding:10px 18px;cursor:pointer}textarea{display:block;box-sizing:border-box;width:100%;min-height:65px;margin:8px 0 16px;font:14px/1.6 sans-serif}.preview{box-sizing:border-box;width:100%;max-width:407px;margin:20px auto;padding:20px 16px;background:#fff}.preview section{min-width:0}#status{line-height:1.7;font-size:14px;color:#555}@media(max-width:430px){.preview{margin:0 auto}.controls{margin:0 auto}}</style></head>
<body><aside class="controls"><h1 style="font-size:20px">06 篇发布候选稿</h1><p>当前样式：第一批格式验收完成 · 第二批格式验收完成 · LaTeX 数学排版独立第三批</p><p>查看位置：第 4 节末尾的工作流路径；第 5 节中的目录树和 job／step 列表；第 8 节小结后的参考资料。第 5 节改为“从整体结构逐层展开”：整体骨架、阶段、步骤与凭据作用域。局部片段用于讲解，不可拼接成完整文件。第二批格式已按记录范围验收。</p><p>行内代码采用 14px 等宽字、深蓝灰文字与浅灰底，不使用语法高亮；请检查中文混排、基线和换行。代码块样式保持不变。</p><p>代码采用完整 pre/code 结构，13px 等宽字体、行高 1.6、左右内边距 10px，长行只视觉折行；关键字深蓝、字符串棕红、注释深灰绿。请检查微信保存与手机预览后复制出的缩进、换行和特殊字符。</p><p>下方预览区域只有正文。标题、摘要分别填入后台对应字段；本稿包含 4 张图片：开头鸟图抬头（无图注）、第 3 节 DAG 转图、第 3 节 shell 与 DAG 对比图、第 7 节原图。本稿使用自有 CDN 图片，Chrome 复制全文到微信的显示链路已验证，不需要上传微信素材库；保存重开及手机显示按实际结果确认。第一批已使用格式均获用户确认；发布状态与原文链接配置单独检查。</p>
<label>标题<textarea readonly>${esc(title)}</textarea></label><label>摘要<textarea readonly>${esc(summary)}</textarea></label>
<label>后台原文链接（待配置并验证）<textarea readonly>${esc(data.origin_url)}</textarea></label><p>尾部已使用“阅读原文”引导，发布前请配置此链接并确认入口有效。</p>
<p id="image-status" role="status">正在检查正文图片加载状态……</p><p><a href="https://media.xiaolin.fun/docs/img-pipeline-basics/infographic-traditional-ops.png" target="_blank" rel="noopener noreferrer">单独打开原图，检查当前环境能否访问</a></p><button id="copy">复制正文</button><p id="status" role="status">复制后在公众号正文区普通粘贴，勿选择“粘贴为纯文本”。</p></aside>
<main class="preview"><section id="article" style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;font-size:15px;line-height:1.8;color:#333;text-align:left;">${article}</section></main>
<script>
const pictureStatus=document.getElementById('image-status');
const articlePictures=[...document.querySelectorAll('#article img')];
const refreshPictureStatus=()=>{
 if(!articlePictures.length){pictureStatus.textContent='未找到正文图片，请确认打开的是图片加载排查版 2。';return}
 if(articlePictures.some(img=>!img.complete)){pictureStatus.textContent='正文图片正在加载。';return}
 pictureStatus.textContent=articlePictures.every(img=>img.naturalWidth>0)
 ? '正文图片已加载：'+articlePictures.map(img=>img.naturalWidth+' × '+img.naturalHeight).join('，')
 : '正文图片加载失败。请单独打开原图，并告知当前使用的预览环境。';
};
for(const img of articlePictures){img.addEventListener('load',refreshPictureStatus);img.addEventListener('error',refreshPictureStatus);img.title='点击查看原图';img.addEventListener('click',()=>window.open(img.src,'_blank','noopener,noreferrer'))}
refreshPictureStatus();
document.getElementById('copy').onclick=async()=>{
 const a=document.getElementById('article'),s=document.getElementById('status');
 const pictures=[...a.querySelectorAll('img')];
 if(pictures.some(img=>!img.complete)){s.textContent='正文图片尚未加载完成，请稍后再次复制。';return}
 if(pictures.some(img=>img.naturalWidth===0)){s.textContent='正文图片加载失败，请确认图片显示正常后再复制。';return}
 const nativeCopy=()=>{const selection=getSelection(),r=document.createRange();r.selectNode(a);selection.removeAllRanges();selection.addRange(r);let ok=false;try{ok=document.execCommand('copy')}catch(e){}if(ok)selection.removeAllRanges();return ok};
 try{if(!navigator.clipboard||!window.ClipboardItem)throw Error('fallback');await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([a.outerHTML],{type:'text/html'}),'text/plain':new Blob([a.innerText],{type:'text/plain'})})]);s.textContent='正文已复制。请到微信粘贴、保存重开，再发送手机预览。'}
 catch(e){s.textContent=nativeCopy()?'正文已按原生方式复制，请到微信粘贴并检查。':'自动复制未成功，正文已选中，请按 Cmd/Ctrl+C 复制。'}
};
</script></body></html>`;
fs.writeFileSync(path.join(dir, 'wechat.html'), page);
console.log(JSON.stringify({ output: path.join(dir, 'wechat.html'), characters: content.length,
  tables: bodyTokens.filter(t => t.type === 'table_open').length,
  codeBlocks: bodyTokens.filter(t => t.type === 'fence').length, images: bodyTokens.flatMap(t => t.children ?? []).filter(t => t.type === 'image').length, status: '第二批格式已验收；文章发布状态独立维护' }, null, 2));
