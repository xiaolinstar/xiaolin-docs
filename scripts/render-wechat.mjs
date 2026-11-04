#!/usr/bin/env node
// 通用公众号渲染脚本：node scripts/render-wechat.mjs <wechat.md>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import matter from 'gray-matter';
import assert from 'node:assert/strict';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 解析命令行参数
const inputFile = process.argv[2];
if (!inputFile) {
  console.error('用法: node render-wechat.mjs <wechat.md>');
  process.exit(1);
}

const inputPath = path.resolve(inputFile);
const dir = path.dirname(inputPath);

// 加载 highlight.js 和语言
const hljsPath = path.join(__dirname, '../tools/md-wechat/node_modules/highlight.js/lib/core.js');
const hljs = (await import(hljsPath)).default;

const languages = ['bash', 'groovy', 'yaml', 'typescript', 'javascript', 'json'];
for (const lang of languages) {
  try {
    const langModule = await import(path.join(__dirname, `../tools/md-wechat/node_modules/highlight.js/lib/languages/${lang}.js`));
    hljs.registerLanguage(lang, langModule.default);
  } catch (e) {
    // 语言不可用，跳过
  }
}

// 读取 wechat.md 和 meta.yaml
const { content, data } = matter(fs.readFileSync(inputPath, 'utf8'));
const metaPath = path.join(dir, 'meta.yaml');
const meta = fs.existsSync(metaPath) ? matter(fs.readFileSync(metaPath, 'utf8')).data : {};

const summary = meta.summary || data.summary || '';
const originUrl = data.origin_url || meta.origin_url || '';
const slug = meta.slug || path.basename(dir);

// 解析 Markdown
const md = new MarkdownIt({ html: false, linkify: false, breaks: false });
const tokens = md.parse(content, {});

// 抬头图检测
let headTokens = [];
let bodyStart = 0;
if (tokens[0]?.type === 'paragraph_open' && tokens[1]?.type === 'inline'
  && tokens[1].children?.length === 1 && tokens[1].children[0].type === 'image') {
  headTokens = tokens.slice(0, 3);
  bodyStart = 3;
}
assert(headTokens.length, '缺少开头抬头图');
assert.equal(tokens[bodyStart]?.type, 'heading_open');
assert.equal(tokens[bodyStart]?.tag, 'h1');
const h1Title = tokens[bodyStart + 1]?.content || '';
const bodyTokens = [...headTokens, ...tokens.slice(bodyStart + 3)];

// 样式定义（与 format-collection.md SLA 一致）
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

// 允许的 token 类型
const allowed = new Set([
  'paragraph_open', 'paragraph_close', 'heading_open', 'heading_close',
  'bullet_list_open', 'bullet_list_close', 'ordered_list_open', 'ordered_list_close',
  'list_item_open', 'list_item_close', 'blockquote_open', 'blockquote_close',
  'inline', 'fence', 'hr',
  'table_open', 'table_close', 'thead_open', 'thead_close', 'tbody_open', 'tbody_close',
  'tr_open', 'tr_close', 'th_open', 'th_close', 'td_open', 'td_close'
]);

// 验证 token
for (const token of bodyTokens) {
  if (!allowed.has(token.type)) {
    console.warn(`警告: 未处理的 token 类型: ${token.type}`);
    continue;
  }
  if (token.type === 'heading_open' && !['h2', 'h3'].includes(token.tag)) {
    console.warn(`警告: 正文仅使用二、三级标题，发现 ${token.tag}`);
  }
  if (token.type === 'fence') {
    const lines = token.content.trimEnd().split('\n');
    if (lines.length > 15) console.warn(`警告: 代码块 ${lines.length} 行，超出 SLA（15 行）`);
    const maxLineLen = Math.max(...lines.map(line => [...line].length));
    if (maxLineLen > 72) console.warn(`警告: 代码行最长 ${maxLineLen} 字符，超出 SLA（72）`);
  }
}

// 代码高亮
const esc = md.utils.escapeHtml;
const highlightColors = {
  keyword: '#005cc5', built_in: '#005cc5', literal: '#005cc5',
  string: '#a33a20', regexp: '#a33a20', comment: '#526b56', meta: '#526b56',
  number: '#005cc5', type: '#005cc5', params: '#333',
  title: '#333', attr: '#333', symbol: '#a33a20', section: '#334e68',
};

md.renderer.rules.fence = (ts, i) => {
  const token = ts[i];
  const language = token.info.trim().split(/\s+/)[0];
  const highlighted = hljs.getLanguage(language)
    ? hljs.highlight(token.content, { language, ignoreIllegals: true }).value
    : esc(token.content);
  const code = highlighted.replace(/<span class="([^"]+)"/g, (_, classes) => {
    const kind = classes.split(/\s+/).find(c => c.startsWith('hljs-'))?.slice(5);
    return `<span style="color:${highlightColors[kind] ?? '#333'};">`;
  });
  return `<pre style="${styles.codeBlock}"><code style="${styles.codeContent}">${code}</code></pre>\n`;
};

// 标题渲染
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

// 图片渲染
md.renderer.rules.image = (ts, i) => {
  const token = ts[i];
  const src = token.attrGet('src');
  const caption = token.content;
  const isHead = src?.endsWith('/ai-ops-mascot.png');
  const width = 1200;
  const height = isHead ? 520 : 675;
  const displayWidth = '100%';
  if ([...caption].length > 40) console.warn(`警告: 图注 ${caption.length} 字符，超出 SLA（40）`);
  if (isHead) {
    return `<img width="${width}" height="${height}" loading="eager" referrerpolicy="no-referrer" src="${esc(src)}" alt="${esc(caption)}" style="display:block;box-sizing:border-box;width:100%;max-width:100%;height:auto;margin:0 auto 16px;">`;
  }
  return `<img width="${width}" height="${height}" loading="eager" referrerpolicy="no-referrer" src="${esc(src)}" alt="${esc(caption)}" style="display:block;box-sizing:border-box;width:${displayWidth};max-width:100%;height:auto;margin:0 auto 6px;"><span style="display:block;font-size:13px;line-height:1.6;color:#666;text-align:center;">${esc(caption)}</span>`;
};

// 行内代码
md.renderer.rules.code_inline = (ts, i) => `<code style="${styles.code}">${esc(ts[i].content)}</code>`;

// 引用块
md.renderer.rules.blockquote_open = () => '<section style="box-sizing:border-box;margin:16px 0;padding:0 0 0 12px;border-left:3px solid #b8c6cf;">';
md.renderer.rules.blockquote_close = () => '</section>\n';

// 分隔线
md.renderer.rules.hr = () => '<section style="box-sizing:border-box;width:100%;height:0;margin:16px 0;border:0;border-top:1px solid #dce2e8;font-size:0;line-height:0;"></section>\n';

// 列表和参考资料处理
let listDepth = 0;
let inReferences = false;
let referenceNumber = 0;

for (let i = 0; i < bodyTokens.length; i++) {
  const token = bodyTokens[i];
  if (['bullet_list_open', 'ordered_list_open'].includes(token.type)) listDepth++;
  if (['bullet_list_close', 'ordered_list_close'].includes(token.type)) listDepth--;
  if (token.type === 'heading_open') inReferences = bodyTokens[i + 1]?.content === '参考资料';
  if (token.type !== 'inline') continue;
  if (listDepth) {
    for (const child of token.children ?? []) {
      if (['strong_open', 'strong_close'].includes(child.type)) child.meta = { listBold: true };
    }
  }
  const ref = inReferences && token.content.match(/^\[(\d+)\]\s*(.+?)$/);
  if (ref) {
    referenceNumber++;
    const urlMatch = bodyTokens[i + 1]?.content?.match(/^(https:\/\/\S+)$/);
    if (urlMatch) {
      token.meta = { reference: { number: referenceNumber, title: ref[2], url: urlMatch[1] } };
      token.children[0].meta = token.meta;
    }
  }
}

// 加粗渲染
md.renderer.rules.strong_open = (ts, i, options) => ts[i].meta?.listBold
  ? '<span style="display:inline;font-weight:700;color:#222;">'
  : md.renderer.renderToken(ts, i, options);
md.renderer.rules.strong_close = (ts, i, options) => ts[i].meta?.listBold
  ? '</span>' : md.renderer.renderToken(ts, i, options);

// 参考资料渲染
const originalRenderInline = md.renderer.renderInline.bind(md.renderer);
md.renderer.renderInline = (ts, options, env) => {
  const ref = ts[0]?.meta?.reference;
  if (!ref) return originalRenderInline(ts, options, env);
  return `<span style="font-size:13px;font-weight:400;color:#555;">[${ref.number}] ${esc(ref.title)}</span><br><span style="font-size:13px;font-weight:400;color:#666;word-break:normal;overflow-wrap:anywhere;">${esc(ref.url)}</span>`;
};

// 通用 token 渲染
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

// 渲染正文
const article = md.renderer.render(bodyTokens, md.options, {});

// 验证
if (/发布元数据|发布 checklist|origin:/i.test(article)) {
  console.warn('警告: 正文包含元数据内容');
}
if (/<svg|<a\s/.test(article)) {
  console.warn('警告: 正文包含 SVG 或链接');
}

// 生成页面
const page = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(h1Title)}</title>
<style>body{margin:0;background:#eee;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#333}.controls{max-width:720px;margin:20px auto;padding:20px;background:#fff}button{padding:10px 18px;cursor:pointer}textarea{display:block;box-sizing:border-box;width:100%;min-height:65px;margin:8px 0 16px;font:14px/1.6 sans-serif}.preview{box-sizing:border-box;width:100%;max-width:407px;margin:20px auto;padding:20px 16px;background:#fff}.preview section{min-width:0}#status{line-height:1.7;font-size:14px;color:#555}@media(max-width:430px){.preview{margin:0 auto}.controls{margin:0 auto}}</style></head>
<body><aside class="controls"><h1 style="font-size:20px">${esc(slug)} 发布候选稿</h1>
<p>渲染自: ${esc(path.basename(inputFile))}</p>
<label>标题<textarea readonly>${esc(h1Title)}</textarea></label>
<label>摘要<textarea readonly>${esc(summary)}</textarea></label>
${originUrl ? `<label>后台原文链接<textarea readonly>${esc(originUrl)}</textarea></label>` : ''}
<p id="image-status" role="status">正在检查正文图片加载状态…</p>
<button id="copy">复制正文</button>
<p id="status" role="status">复制后在公众号正文区普通粘贴，勿选择"粘贴为纯文本"。</p>
</aside>
<main class="preview"><section id="article" style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;font-size:15px;line-height:1.8;color:#333;text-align:left;">${article}</section></main>
<script>
const pictureStatus=document.getElementById('image-status');
const articlePictures=[...document.querySelectorAll('#article img')];
const refreshPictureStatus=()=>{
  if(!articlePictures.length){pictureStatus.textContent='未找到正文图片。';return}
  if(articlePictures.some(img=>!img.complete)){pictureStatus.textContent='正文图片正在加载。';return}
  pictureStatus.textContent=articlePictures.every(img=>img.naturalWidth>0)
    ? '正文图片已加载：'+articlePictures.map(img=>img.naturalWidth+' × '+img.naturalHeight).join('，')
    : '正文图片加载失败。';
};
for(const img of articlePictures){img.addEventListener('load',refreshPictureStatus);img.addEventListener('error',refreshPictureStatus);img.title='点击查看原图';img.addEventListener('click',()=>window.open(img.src,'_blank','noopener,noreferrer'))}
refreshPictureStatus();
document.getElementById('copy').onclick=async()=>{
  const a=document.getElementById('article'),s=document.getElementById('status');
  const pictures=[...a.querySelectorAll('img')];
  if(pictures.some(img=>!img.complete)){s.textContent='正文图片尚未加载完成，请稍后再复制。';return}
  if(pictures.some(img=>img.naturalWidth===0)){s.textContent='正文图片加载失败，请确认图片显示正常后再复制。';return}
  const nativeCopy=()=>{const selection=getSelection(),r=document.createRange();r.selectNode(a);selection.removeAllRanges();selection.addRange(r);let ok=false;try{ok=document.execCommand('copy')}catch(e){}if(ok)selection.removeAllRanges();return ok};
  try{if(!navigator.clipboard||!window.ClipboardItem)throw Error('fallback');await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([a.outerHTML],{type:'text/html'}),'text/plain':new Blob([a.innerText],{type:'text/plain'})})]);s.textContent='正文已复制。请到微信粘贴、保存重开，再发送手机预览。'}
  catch(e){s.textContent=nativeCopy()?'正文已按原生方式复制，请到微信粘贴并检查。':'自动复制未成功，正文已选中，请按 Cmd/Ctrl+C 复制。'}
};
</script></body></html>`;

// 输出
const outputPath = path.join(dir, 'wechat.html');
fs.writeFileSync(outputPath, page);
console.log(JSON.stringify({
  output: outputPath,
  characters: content.length,
  tables: bodyTokens.filter(t => t.type === 'table_open').length,
  codeBlocks: bodyTokens.filter(t => t.type === 'fence').length,
  images: bodyTokens.flatMap(t => t.children ?? []).filter(t => t.type === 'image').length,
  status: '渲染完成'
}, null, 2));
