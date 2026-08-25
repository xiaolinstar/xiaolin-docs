import fs from 'node:fs';
import path from 'node:path';
import MarkdownIt from 'markdown-it';

const input = process.argv[2];
const output = process.argv[3] ?? input?.replace(/\.md$/, '-wechat.html');
if (!input || !output) throw new Error('用法：node scripts/render-wechat-origin.mjs <origin.md> [output.html]');

const source = fs.readFileSync(input, 'utf8');
const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n?/);
const title = frontmatter?.[1].match(/^title:\s*(.+)$/m)?.[1].trim() ?? path.basename(input, '.md');
const body = source.replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/\{\{term:([^}]+)\}\}/g, '$1');

const imageData = (url) => {
  const local = url.match(/^\/images\/(.+)$/)?.[1];
  if (!local) return url;
  const file = path.join('docs', 'public', 'images', local);
  if (!fs.existsSync(file)) return url;
  const data = fs.readFileSync(file);
  const ext = path.extname(file).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.gif' ? 'image/gif' : 'image/png';
  return `data:${mime};base64,${data.toString('base64')}`;
};

const md = new MarkdownIt({ html: true, linkify: true, breaks: false,
  highlight: (code) => `<pre><code>${md.utils.escapeHtml(code)}</code></pre>` });
md.renderer.rules.image = (tokens, index, options, env, self) => {
  tokens[index].attrSet('src', imageData(tokens[index].attrGet('src')));
  return self.renderToken(tokens, index, options);
};
const rendered = md.render(body);
const esc = (text) => text.replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
:root{--blue:#1677ff;--text:#1f2937;--muted:#667085;--border:#e5e7eb;--code:#f6f8fa}*{box-sizing:border-box}body{margin:0;background:#f5f7fa;color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.toolbar{position:sticky;top:0;z-index:5;padding:12px;text-align:center;background:#fff;border-bottom:1px solid var(--border)}button{border:0;border-radius:6px;padding:9px 18px;background:var(--blue);color:#fff;font-size:14px;cursor:pointer}.status{margin-left:10px;color:var(--muted);font-size:13px}.article{max-width:760px;margin:24px auto;padding:42px 48px;background:#fff;font-size:16px;line-height:1.9;letter-spacing:.01em}.article h1{margin:0 0 30px;color:#101828;font-size:30px;line-height:1.35}.article h2{margin:38px 0 18px;padding-left:12px;border-left:4px solid var(--blue);color:#101828;font-size:22px;line-height:1.45}.article h3{margin:28px 0 12px;color:#175cd3;font-size:18px;line-height:1.5}.article p{margin:0 0 16px}.article a{color:#175cd3;text-decoration:none}.article strong{color:#101828}.article blockquote{margin:20px 0;padding:12px 16px;border-left:4px solid #f79009;background:#fffaeb;color:#475467}.article ul,.article ol{padding-left:1.6em;margin:10px 0 18px}.article li{margin:5px 0}.article code{padding:2px 5px;border-radius:4px;background:#eef4ff;color:#175cd3;font:13px/1.5 Menlo,Consolas,monospace}.article pre{margin:20px 0;padding:16px;overflow-x:auto;border:1px solid var(--border);border-radius:6px;background:var(--code);line-height:1.55}.article pre code{padding:0;background:transparent;color:#24292f;white-space:pre;font-size:13px}.article img{display:block;max-width:100%;height:auto;margin:20px auto}.article table{display:block;width:100%;margin:20px 0;border-collapse:collapse;overflow-x:auto;font-size:14px}.article th,.article td{min-width:110px;padding:9px 10px;border:1px solid #d0d5dd;text-align:left;vertical-align:top;line-height:1.6}.article th{background:#f2f4f7;color:#101828;font-weight:600}.footer{margin-top:44px;padding-top:18px;border-top:1px solid var(--border);color:var(--muted);font-size:13px;text-align:center}@media(max-width:600px){.article{margin:0;padding:28px 18px;font-size:16px}.article h1{font-size:26px}.article h2{font-size:20px}.status{display:block;margin:8px 0 0}.toolbar{padding:10px}.article pre{margin-left:-4px;margin-right:-4px}}
</style></head><body><div class="toolbar"><button id="copy">复制正文</button><span class="status" id="status">复制后可直接粘贴到公众号后台</span></div><main class="article" id="article"><h1>${esc(title)}</h1>${rendered}<div class="footer">原文：AI持续运维 · xiaolinstar.cn</div></main><script>document.getElementById('copy').onclick=()=>{const r=document.createRange();r.selectNodeContents(document.getElementById('article'));const s=getSelection();s.removeAllRanges();s.addRange(r);let ok=false;try{ok=document.execCommand('copy')}catch(e){}s.removeAllRanges();document.getElementById('status').textContent=ok?'已复制，可粘贴到公众号后台':'复制失败，请手动选择正文复制';}</script></body></html>`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(output);
