import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import MarkdownIt from 'markdown-it';

const input = process.argv[2] ?? 'content/dist/delivery-start/wechat.md';
const output = process.argv[3] ?? input.replace(/\.md$/, '-copy.html');
const source = fs.readFileSync(input, 'utf8');
const flattenMarkdownTables = (text) => text.replace(/(^|\n)((?:\|[^\n]+\|\n)+)/g, (full, prefix, block) => {
  const lines = block.trim().split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2 || !/^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/.test(lines[1])) return full;
  const cells = (line) => line.replace(/^\|\s*|\s*\|$/g, '').split('|').map((cell) => cell.trim());
  const headers = cells(lines[0]);
  const rows = lines.slice(2).map(cells);
  return `${prefix}${rows.map((row) => {
    const title = row[0] ?? '';
    const details = row.slice(1).map((value, index) => `${headers[index + 1] ?? '说明'}：${value}`).join('；');
    return `**${title}**${details ? `：${details}` : ''}`;
  }).join('\n\n')}\n\n`;
});
const originPath = source.match(/^origin:\s*(docs\/[^\n]+)$/m)?.[1];
const articleSource = originPath && fs.existsSync(originPath) ? fs.readFileSync(originPath, 'utf8') : source;
const imageDataUri = (imageUrl) => {
  const matched = imageUrl.match(/^(?:https:\/\/media\.xiaolin\.fun\/docs\/|\/images\/)(img-[^/]+)\/([^/?#]+)$/);
  if (!matched) return imageUrl;

  const imagePath = path.join('docs', 'public', 'images', matched[1], matched[2]);
  if (!fs.existsSync(imagePath)) return imageUrl;

  const data = fs.readFileSync(imagePath);
  const mime = data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${data.toString('base64')}`;
};
const body = articleSource
  .replace(/\]\(([^)]+)\)\s+提到/g, ']($1)提到')
  .replace(/^---[\s\S]*?---\n/, '')
  .replace(/^# 发布元数据[\s\S]*?^# 正文（粘贴到公众号后台）\n/m, '')
  .replace(/^---\n\n## 封面图（Codex 生成）[\s\S]*$/m, '')
  .replace(/```mermaid[\s\S]*?```\n?/g, '> **流程图提示**：完整流程图请查看站点原文；公众号稿保留对应的步骤说明与验证命令。\n\n')
  .replace(/^完整版与延伸阅读.*\n\n?/m, '')
  .replace(/^关注 \*\*AI持续运维\*\*，.*\n\n?/m, '')
  .replace(/^不积跬步，无以至千里。\n\n?/m, '')
  .replace(/^详见专题解析：\[[^\]]+\]\([^)]+\)。\n\n?/m, '')
  .replace(/^详见 \[《AI Agent 时代下重新审视 Git》\]\([^)]+\)。\n\n?/m, '')
  .replace(/### 留给下一篇的遗留痛点[\s\S]*?(?=^## 思考)/m, `### 仍待解决的问题

Git 解决了代码版本锚定与源码免 scp 传输，但服务器拿到源码后，依然要在线执行 \`mvn package\`、安装 JDK 或 Python；编译也仍会和线上服务争抢 CPU。换句话说，Git 锁定了代码版本，却锁不住运行环境。

如何把编译后的产物和运行环境一起交付，仍是服务端部署需要继续处理的问题。\n\n`)
  .replace(/### 补充视角：前后端不分离架构在部署上的差异[\s\S]*$/, `### 补充视角：模板渲染应用如何部署

模板渲染并不“过时”，它只是把页面生成和业务处理放进了同一个部署单元。

> **一个部署单元 = 页面 + 静态资源 + 业务逻辑**
>
> JSP、PHP、Thymeleaf、Django Templates 等应用会由后端进程直接生成 HTML，静态资源也随应用工程一起交付。

这会带来两个直接后果：页面改动不再是简单覆盖 \`dist/\`，而是重新构建并重启应用；Nginx 也从静态资源宿主变成统一的反向代理入口。

如果页面需要独立迭代、独立缓存或多端复用 API，前后端分离更合适；若是低频变更的内部后台或单体系统，模板渲染仍是一个足够务实的选择。\n`)
  .replace(/^## 搜索关键词（4 个）\n\n[^\n]+\n\n?/m, '')
  .replace(/^## 参考[\s\S]*$/m, '')
  .replace(/::: details[\s\S]*?\n:::\n?/g, '')
  .replace(/^> \[!(NOTE|TIP|WARNING)\]\n> \*\*(.+?)\*\*[：:]/gm, (_, type, title) => `> **${({ NOTE: '提示', TIP: '建议', WARNING: '注意' })[type]}｜${title}**\n>\n> `)
  .replace(/\{\{term:([^}]+)\}\}/g, '$1')
  .replace(/^ {2,}[-*] (.+)$/gm, '   <br><span class="wechat-subitem">↳</span> $1')
  .replace(/^# 发布 checklist[\s\S]*$/m, '')
  .replace(/^## 封面图[\s\S]*$/m, '')
  .replace(/```text\n[\s\S]*?Welcome to nginx![\s\S]*?```\n?/m, '> **Welcome to nginx!**\n>\n> Nginx 已安装并正常运行。接下来还需要配置站点，才能代理你自己的静态资源。\n\n')
  .replace(/^# .*\n\n?/, '')
  .replace(/^# 正文（粘贴到公众号后台）\n/m, '')
  .replace(/^# .*\n\n?/, '')
  .trim();

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const normalizeFormula = (formula) => formula
  .replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '')
  .replace(/\\begin\{array\}\{[^}]*\}|\\end\{array\}/g, '')
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
const formulaHtmlText = (formula) => escapeHtml(normalizeFormula(formula)
  .replace(/\\longrightarrow/g, '→')
  .replace(/\\implies/g, '⇒')
  .replace(/\\/g, ''))
  .replace(/([A-Za-z])_\{?([A-Za-z0-9]+)\}?/g, (_, letter, subscript) => `${letter}<sub style="font-size:0.76em;line-height:0;vertical-align:-0.32em;">${subscript}</sub>`)
  .replace(/([A-Za-z])([₀₁₂₃₄₅₆₇₈₉ᵢₙⱼₖₘᵣₛₓ]+)/g, (_, letter, subscript) => `${letter}<sub style="font-size:0.76em;line-height:0;vertical-align:-0.32em;">${subscript}</sub>`);
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
  return `<p class="formula-block" style="margin:16px 0;padding:0;overflow-x:auto;background:transparent;border:0;color:#0a152f;font-family:'STIX Two Math','Cambria Math',Georgia,'Times New Roman',serif;font-size:1em;line-height:1.6;white-space:nowrap;"><span style="display:inline-block;box-sizing:border-box;min-width:100%;margin:0;padding:9px 12px;text-align:center;background:#f7f9fc;border:1px solid #d9e2ec;border-radius:6px;color:#0a152f;font-family:'STIX Two Math','Cambria Math',Georgia,'Times New Roman',serif;font-size:1.05em;line-height:1.6;white-space:nowrap;">${formulaHtmlText(formula)}</span></p>`;
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
  return `<span style="display:inline;font-family:'STIX Two Math','Cambria Math',Georgia,'Times New Roman',serif;font-size:1em;color:inherit;white-space:normal;">${formulaHtmlText(formula)}</span>`;
};
const inlineCodeTokens = [];
const bodyWithProtectedInlineCode = body.replace(/`([^`\n]+)`/g, (_, code) => {
  const token = `@@WECHAT_INLINE_CODE_${inlineCodeTokens.length}@@`;
  inlineCodeTokens.push(code);
  return token;
});
const normalizedBody = bodyWithProtectedInlineCode
  .replace(/!\[([^\]]*)\]\(((?:https:\/\/media\.xiaolin\.fun\/docs\/|\/images\/)[^)]+)\)/g, (_, alt, imageUrl) => `![${alt}](${imageDataUri(imageUrl)})`)
  .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, imagePath) => `![${alt}](${imagePath})`)
  .replace(/(?<!\!)\[([^\]]+)\]\((?:https?:\/\/|\.\.?\/)[^)]+\)/g, '$1')
  .replace(/X\s*\\xrightarrow\{\\text\{突破\}\}\s*X'/g, 'X → X\'')
  .replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => renderFormula(formula) + '\n\n')
  .replace(/\$([^$\n]+)\$/g, (_, formula) => renderInlineFormula(formula))
  .replace(/@@WECHAT_INLINE_CODE_(\d+)@@/g, (_, index) => `\`${inlineCodeTokens[Number(index)]}\``);
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
  highlight: (source, language) => language === 'text'
    ? `<pre class="text-diagram" style="margin:16px 0;padding:12px 14px;overflow-x:auto;background:#f6f8fa;border:1px solid #e5e6eb;border-radius:5px;line-height:1.45;white-space:pre;"><code style="font-family:Menlo,Consolas,monospace;font-size:12px;white-space:pre;">${escapeHtml(source)}</code></pre>`
    : `<pre style="margin:16px 0;padding:12px 14px;overflow-x:auto;background:#f6f8fa;border:1px solid #e5e6eb;border-radius:5px;line-height:1.45;white-space:pre;"><code style="font-family:Menlo,Consolas,monospace;font-size:12px;white-space:pre;">${highlightCode(source, language)}</code></pre>`
});
md.renderer.rules.code_inline = (tokens, index) => {
  const content = tokens[index].content;
  const isLong = content.length > 34;
  const style = isLong
    ? 'font-family:inherit;font-size:inherit;line-height:inherit;white-space:normal;color:inherit;'
    : 'font-family:inherit;font-size:inherit;line-height:inherit;white-space:normal;color:inherit;';
  const renderedContent = isLong ? escapeHtml(content) : escapeHtml(content).replace(/ /g, '&nbsp;');
  return `<code style="${style}">${renderedContent}</code>`;
};
const renderedArticle = md.render(normalizedBody.replace(/^# [^\n]+\n+/, ''));
const tableRows = (table) => [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, row]) => [...row.matchAll(/<(?:th|td)>([\s\S]*?)<\/(?:th|td)>/g)].map(([, cell]) => cell.trim()));
const compactTable = (table) => table
  .replace('<table>', '<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;line-height:1.55;color:#344054;">')
  .replace(/<th>/g, '<th style="border:1px solid #d9d9d9;padding:7px 6px;background:#f6f7f9;color:#172033;font-weight:700;text-align:left;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;">')
  .replace(/<td>/g, '<td style="border:1px solid #d9d9d9;padding:7px 6px;color:#344054;text-align:left;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;">');
const cardShell = (title, content, accent = '#1890ff', background = '#f7f9fc') => `<section style="margin:8px 0;padding:9px 11px;border-left:4px solid ${accent};background:${background};border-radius:0 6px 6px 0;"><p style="margin:0 0 4px;font-size:15px;line-height:1.4;font-weight:700;color:#172033;">${title}</p>${content}</section>`;
const cardCell = (cell) => cell.replace(/white-space:nowrap/g, 'white-space:normal;overflow-wrap:anywhere');
const cardsByColumn = (table) => {
  const [headers, ...rows] = tableRows(table);
  return headers.slice(1).map((title, column) => cardShell(title, rows.map((row) => `<p style="margin:3px 0;font-size:13px;line-height:1.5;color:#344054;"><strong style="color:#475467;">${row[0]}：</strong>${cardCell(row[column + 1])}</p>`).join(''), ['#1890ff', '#fa8c16', '#52c41a'][column] ?? '#1890ff')).join('');
};
const cardsByRow = (table, accent = '#1890ff') => {
  const [headers, ...rows] = tableRows(table);
  return rows.map((row) => cardShell(row[0], row.slice(1).map((cell, index) => `<p style="margin:3px 0;font-size:13px;line-height:1.5;color:#344054;"><strong style="color:#475467;">${headers[index + 1]}：</strong>${cardCell(cell)}</p>`).join(''), accent)).join('');
};
const headerText = (cell) => cell.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
const hasHeaders = (table, expected) => {
  const [headers] = tableRows(table);
  return headers?.map(headerText).join('|') === expected.join('|');
};
const wechatTableItem = (title, content, accent = '#1890ff') => `<section style="margin:12px 0;padding:0 0 10px;border-bottom:1px solid #e8edf3;"><p style="margin:0 0 6px;font-size:15px;line-height:1.45;font-weight:700;color:#172033;"><span style="display:inline-block;margin-right:7px;color:${accent};">●</span>${title}</p>${content}</section>`;
const wechatLabel = (label, color = '#667085') => `<span style="display:inline-block;margin-right:6px;padding:1px 5px;border-radius:3px;background:#f3f5f7;color:${color};font-size:12px;line-height:1.45;font-weight:700;">${label}</span>`;
const renderBackupComparison = (table) => {
  const [, ...rows] = tableRows(table);
  return `<section style="margin:16px 0 18px;">${rows.map((row) => wechatTableItem(row[0], `<p style="margin:0 0 4px;font-size:14px;line-height:1.65;color:#475467;">${wechatLabel('手动备份', '#8c8c8c')}${cardCell(row[1])}</p><p style="margin:0;font-size:14px;line-height:1.65;color:#172033;">${wechatLabel('Git', '#1677ff')}${cardCell(row[2])}</p>`)).join('')}</section>`;
};
const renderCommandList = (table) => {
  const [, ...rows] = tableRows(table);
  return `<section style="margin:16px 0 18px;">${rows.map((row) => wechatTableItem(row[0], `<p style="margin:0;font-size:14px;line-height:1.65;color:#344054;">${cardCell(row[1])}<span style="color:#98a2b3;">　—　</span>${cardCell(row[2])}</p>`)).join('')}</section>`;
};
const renderCommitTypes = (table) => {
  const [, ...rows] = tableRows(table);
  return `<section style="margin:14px 0 18px;">${rows.map((row) => `<p style="margin:0 0 7px;font-size:14px;line-height:1.65;color:#344054;"><span style="display:inline-block;min-width:44px;margin-right:7px;padding:2px 5px;border-radius:3px;background:#eaf3ff;color:#175da4;font-family:Menlo,Consolas,monospace;font-size:12px;font-weight:700;text-align:center;">${cardCell(row[0])}</span><strong style="color:#172033;">${cardCell(row[1])}</strong><span style="color:#98a2b3;">　·　</span>${cardCell(row[2])}</p>`).join('')}</section>`;
};
const renderDirectionList = (table) => {
  const [, ...rows] = tableRows(table);
  return `<section style="margin:14px 0 18px;">${rows.map((row) => `<p style="margin:0 0 7px;font-size:14px;line-height:1.65;color:#344054;">${cardCell(row[0])}<span style="color:#1677ff;font-weight:700;">　${cardCell(row[1])}</span><span style="color:#98a2b3;">　—　</span>${cardCell(row[2])}</p>`).join('')}</section>`;
};
const renderSuitabilityList = (table) => {
  const [, ...rows] = tableRows(table);
  const groups = [
    { title: '推荐放进 Git', match: (state) => state.includes('非常适合') || state.includes('✅ 适合'), color: '#1677ff' },
    { title: '可以使用，但要克制', match: (state) => state.includes('⚠️'), color: '#d48806' },
    { title: '不要放进 Git', match: (state) => state.includes('❌'), color: '#cf1322' }
  ];
  return `<section style="margin:16px 0 18px;">${groups.map((group) => {
    const selected = rows.filter((row) => group.match(headerText(row[1])));
    if (!selected.length) return '';
    return wechatTableItem(group.title, selected.map((row) => `<p style="margin:0 0 4px;font-size:14px;line-height:1.65;color:#344054;"><strong style="color:#172033;">${cardCell(row[0])}</strong><span style="color:#98a2b3;">　—　</span>${cardCell(row[2])}</p>`).join(''), group.color);
  }).join('')}</section>`;
};
const renderMobileTwoColumnTable = (leftHeader, rightHeader, rows) => `<table style="width:100%;margin:16px 0;border-collapse:collapse;table-layout:fixed;border-top:2px solid #175da4;border-bottom:1px solid #d9e2ec;font-size:14px;line-height:1.65;color:#344054;"><tbody><tr><td style="width:31%;padding:7px 5px;border-bottom:1px solid #d9e2ec;color:#175da4;text-align:left;vertical-align:top;font-weight:700;">${leftHeader}</td><td style="width:69%;padding:7px 5px;border-bottom:1px solid #d9e2ec;color:#175da4;text-align:left;vertical-align:top;font-weight:700;">${rightHeader}</td></tr>${rows.map(([left, right]) => `<tr><td style="width:31%;padding:8px 5px;border-bottom:1px solid #e8edf3;color:#172033;text-align:left;vertical-align:top;font-weight:700;word-break:normal;">${left}</td><td style="width:69%;padding:8px 5px;border-bottom:1px solid #e8edf3;color:#344054;text-align:left;vertical-align:top;word-break:normal;">${right}</td></tr>`).join('')}</tbody></table>`;
const renderMobileThreeColumnTable = (headers, widths, rows) => `<table style="width:100%;margin:16px 0;border-collapse:collapse;table-layout:fixed;border-top:2px solid #175da4;border-bottom:1px solid #d9e2ec;font-size:13px;line-height:1.55;color:#344054;"><tbody><tr>${headers.map((header, index) => `<td style="width:${widths[index]};padding:7px 4px;border-bottom:1px solid #d9e2ec;color:#175da4;text-align:left;vertical-align:top;font-weight:700;word-break:normal;">${header}</td>`).join('')}</tr>${rows.map((row) => `<tr>${row.map((cell, index) => `<td style="width:${widths[index]};padding:8px 4px;border-bottom:1px solid #e8edf3;color:${index === 0 ? '#172033' : '#344054'};text-align:left;vertical-align:top;font-weight:${index === 0 ? '700' : '400'};word-break:normal;">${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const mobileLabel = (label, content, color = '#667085') => `<span style="display:inline-block;margin-right:5px;padding:1px 4px;border-radius:3px;background:#f3f5f7;color:${color};font-size:12px;line-height:1.4;font-weight:700;">${label}</span>${content}`;
const keepShortTablePhrases = (cell) => cell.replace(/<code\b[^>]*>mv<\/code>\s*目录 \+ 重启/g, '重命名目录并重启');
const renderWechatStackedTable = (table) => {
  const [headers, ...rows] = tableRows(table);
  return `<section style="margin:16px 0 20px;border-top:1px solid #d9e2ec;">${rows.map((row) => `<section style="padding:10px 0 9px;border-bottom:1px solid #e8edf3;"><p style="margin:0 0 5px;font-size:15px;line-height:1.55;color:#172033;font-weight:700;">${headers[0]}：${keepShortTablePhrases(cardCell(row[0]))}</p>${row.slice(1).map((cell, index) => `<p style="margin:0 0 ${index === row.length - 2 ? 0 : 4}px;font-size:14px;line-height:1.65;color:#344054;"><span style="display:inline-block;margin-right:6px;color:#1677ff;font-size:12px;font-weight:700;">${headers[index + 1]}：</span>${keepShortTablePhrases(cardCell(cell))}</p>`).join('')}</section>`).join('')}</section>`;
};
const renderWechatTableProse = (table) => {
  const [headers, ...rows] = tableRows(table);
  const headerKey = headers.map(headerText).join('|');
  const item = (label, content) => `<p style="margin:0 0 7px;padding-left:1.05em;text-indent:-1.05em;font-size:15px;line-height:1.62;color:#344054;">•&nbsp;<strong style="color:#172033;">${label}</strong>${content}</p>`;
  const section = (intro, content) => `<section style="margin:16px 0 18px;padding:10px 0 3px;border-top:1px solid #e8edf3;border-bottom:1px solid #e8edf3;"><p style="margin:0 0 8px;font-size:15px;line-height:1.65;color:#475467;">${intro}</p>${content}</section>`;
  if (headerKey === '断点|手动备份|Git') {
    return section('手动备份最容易在三个节点失去控制，而 Git 把它们变成可追溯的记录：', rows.map((row) => item(`${keepShortTablePhrases(cardCell(row[0]))}：`, `手动备份常常是“${keepShortTablePhrases(cardCell(row[1]))}”；使用 Git 后则是“${keepShortTablePhrases(cardCell(row[2]))}”。`)).join(''));
  }
  if (headerKey === '运维场景|命令|说明') {
    return section('常用命令按场景记，不必一次背全：', rows.map((row) => item(`${keepShortTablePhrases(cardCell(row[0]))}：`, `${keepShortTablePhrases(cardCell(row[1]))}，${keepShortTablePhrases(cardCell(row[2]))}。`)).join(''));
  }
  if (headerKey === '前缀|用途|典型示例') {
    return section('日常提交先记住这几个前缀：', rows.map((row) => item(`${keepShortTablePhrases(cardCell(row[0]))}：`, `${keepShortTablePhrases(cardCell(row[1]))}，例如 ${keepShortTablePhrases(cardCell(row[2]))}。`)).join(''));
  }
  if (headerKey === '命令|方向|作用') {
    return section('远程协作只需分清三条方向：', rows.map((row) => item(`${keepShortTablePhrases(cardCell(row[0]))}：`, `${keepShortTablePhrases(cardCell(row[1]))}，${keepShortTablePhrases(cardCell(row[2]))}。`)).join(''));
  }
  if (headerKey === '内容类型|是否适合 Git|原因 / 替代方案') {
    return section('不是所有文件都该放进 Git，可按下面的取舍判断：', rows.map((row) => item(`${keepShortTablePhrases(cardCell(row[0]))}：`, `${keepShortTablePhrases(cardCell(row[1]))}；${keepShortTablePhrases(cardCell(row[2]))}。`)).join(''));
  }
  if (headerKey === '平台|特点|推荐场景') {
    return section('GitHub 不是唯一选择，按团队和网络条件选择平台：', rows.map((row) => item(`${keepShortTablePhrases(cardCell(row[0]))}：`, `${keepShortTablePhrases(cardCell(row[1]))}；适合 ${keepShortTablePhrases(cardCell(row[2]))}。`)).join(''));
  }
  return section('这组信息可以这样理解：', rows.map((row) => item(`${keepShortTablePhrases(cardCell(row[0]))}：`, row.slice(1).map((cell, index) => `${headers[index + 1]} 为“${keepShortTablePhrases(cardCell(cell))}”`).join('；') + '。')).join(''));
};
let tableIndex = 0;
const preserveNativeTables = /docker-basics/.test(input);
const tableOptimizedArticle = renderedArticle.replace(/<table>[\s\S]*?<\/table>/g, (table) => {
  tableIndex += 1;
  if (preserveNativeTables) return compactTable(table);
  const [, ...rows] = tableRows(table);
  if (input.includes('content/dist/git-github/')) {
    return compactTable(table);
  }
  if (hasHeaders(table, ['断点', '手动备份', 'Git'])) return renderMobileThreeColumnTable(['断点', '手动备份', 'Git'], ['22%', '32%', '46%'], rows.map((row) => row.map((cell) => keepShortTablePhrases(cardCell(cell)))));
  if (hasHeaders(table, ['运维场景', '命令', '说明'])) return renderMobileThreeColumnTable(['运维场景', '命令', '说明'], ['28%', '28%', '44%'], rows.map((row) => row.map((cell) => keepShortTablePhrases(cardCell(cell)))));
  if (hasHeaders(table, ['前缀', '用途', '典型示例'])) return renderMobileThreeColumnTable(['前缀', '用途', '典型示例'], ['17%', '24%', '59%'], rows.map((row) => row.map((cell) => keepShortTablePhrases(cardCell(cell)))));
  if (hasHeaders(table, ['命令', '方向', '作用'])) return renderMobileThreeColumnTable(['命令', '方向', '作用'], ['20%', '31%', '49%'], rows.map((row) => row.map((cell) => keepShortTablePhrases(cardCell(cell)))));
  if (hasHeaders(table, ['内容类型', '是否适合 Git', '原因 / 替代方案'])) return renderMobileThreeColumnTable(['内容类型', '是否适合 Git', '原因 / 替代方案'], ['34%', '21%', '45%'], rows.map((row) => row.map((cell) => keepShortTablePhrases(cardCell(cell)))));
  if (hasHeaders(table, ['平台', '特点', '推荐场景'])) return renderMobileThreeColumnTable(['平台', '特点', '推荐场景'], ['18%', '47%', '35%'], rows.map((row) => row.map((cell) => keepShortTablePhrases(cardCell(cell)))));
  if (tableIndex === 3) return cardsByColumn(table);
  if (tableIndex === 5) return cardsByRow(table, '#8c8c8c');
  if (tableIndex === 6) return cardsByRow(table, '#fa8c16');
  if (tableIndex === 1 || tableIndex === 2) return cardsByRow(table, '#1890ff');
  if (tableIndex === 4) return cardsByRow(table, '#fa8c16');
  if (tableIndex === 7) return cardsByRow(table, '#8c8c8c');
  return compactTable(table);
});
const articleHtml = tableOptimizedArticle.replace(/<span class="wechat-subitem">↳<\/span>/g, '<span style="display:inline-block;margin:4px 0 0 0;padding-left:0.2em;color:#667085;font-size:0.93em;">↳</span>').replace(/<td([^>]*)>([\s\S]*?)<\/td>/gi, (_, attrs, cell) => `<td${attrs}>${cell.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '$1')}</td>`).replace(/<ul>\s*([\s\S]*?)\s*<\/ul>/g, (_, items) => {
  const listItems = [...items.matchAll(/<li>([\s\S]*?)<\/li>/g)];
  const compactItems = listItems
    .map(([__, item], index) => `<p style="margin:0 0 ${index === listItems.length - 1 ? 0 : 6}px;padding-left:1.35em;text-indent:-1.35em;font-size:16px;line-height:1.75;letter-spacing:0;color:#343a40;">•&nbsp;${item.trim().replace(/^<p>|<\/p>$/g, '')}</p>`)
    .join('');
  return `<section style="margin:0 0 10px;">${compactItems}</section>`;
}).replace(/<ol>\s*([\s\S]*?)\s*<\/ol>/g, (_, items) => {
  const listItems = [...items.matchAll(/<li>([\s\S]*?)<\/li>/g)];
  const numberedItems = listItems
    .map(([__, item], index) => `<p style="margin:0 0 ${index === listItems.length - 1 ? 0 : 6}px;padding-left:1.6em;text-indent:-1.6em;font-size:16px;line-height:1.75;letter-spacing:0;color:#343a40;">${index + 1}.&nbsp;${item.trim().replace(/^<p>|<\/p>$/g, '')}</p>`)
    .join('');
  return `<section style="margin:0 0 10px;">${numberedItems}</section>`;
}).replace(/<h2(?:\s[^>]*)?>([\s\S]*?)<\/h2>/gi, '<h2 style="width:72%;margin:32px auto 16px;padding:0 0 7px;border-left:0;border-right:0;border-top:0;border-bottom:2px solid #e27842;background:transparent;color:#343a40;font-size:19px;line-height:1.5;text-align:center;font-weight:700;">$1</h2>')
  .replace(/<h3(?:\s[^>]*)?>([\s\S]*?)<\/h3>/gi, '<h3 style="margin:22px 0 10px;padding:0 0 0 9px;border-left:3px solid #e27842;color:#343a40;font-size:17px;line-height:1.55;font-weight:700;">$1</h3>')
  .replace(/<h4(?:\s[^>]*)?>([\s\S]*?)<\/h4>/gi, '<p style="margin:18px 0 10px;color:#175da4;font-size:16px;line-height:1.55;font-weight:700;">$1</p>')
  .replace(/<blockquote(?:\s[^>]*)?>([\s\S]*?)<\/blockquote>/gi, (_, content) => `<section style="margin:12px 0;padding:6px 10px;border-left:2px solid #e6a06a;color:#8a6a52;font-size:14px;line-height:1.6;">${content.replace(/font-size:16px/g, 'font-size:14px').replace(/line-height:1.75/g, 'line-height:1.6').replace(/margin:0 0 6px/g, 'margin:0 0 3px')}</section>`);
const title = source.match(/^title:\s*(.+)$/m)?.[1]?.trim()
  ?? source.match(/^1\.\s+(.+?)(?:（系列化）)?$/m)?.[1]?.trim()
  ?? 'AI持续运维';
const signatureImage = `data:image/png;base64,${fs.readFileSync('docs/public/images/wechat-theme/ai-ops-mascot.png').toString('base64')}`;
const brandHeader = `<img src="${signatureImage}" alt="AI持续运维品牌插图" style="display:block;width:100%;height:auto;margin:0 0 24px;">`;
const brandFooter = '<div style="margin-top:30px;padding:12px 0;border-top:1px solid #d9e2ec;color:#718096;font-size:13px;line-height:1.8;text-align:center;">这里可以插入你的公众号名片</div>';
const articleTitle = `<h1>${escapeHtml(title)}</h1>`;
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>
body{margin:0;background:#f3f6f9;color:#243447;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}.toolbar{position:sticky;top:0;z-index:2;padding:14px;text-align:center;background:#fff;border-bottom:1px solid #e8e8e8}.copy{border:0;border-radius:6px;padding:10px 22px;background:#175da4;color:#fff;font-size:15px;cursor:pointer}.hint{margin-left:12px;color:#888;font-size:13px}.article{box-sizing:border-box;max-width:760px;margin:24px auto;padding:38px 46px;background:#fff;line-height:1.95;font-size:16px;letter-spacing:.01em}.brand-header{display:flex;align-items:center;gap:12px;margin-bottom:18px;color:#0a152f}.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:12px 12px 12px 3px;background:#175da4;color:#fff;font-weight:800;letter-spacing:-1px}.brand-header strong{display:block;font-size:16px;letter-spacing:1px}.brand-header span{display:block;margin-top:2px;color:#718096;font-size:12px}.brand-rule{height:4px;margin-bottom:28px;background:#175da4}.brand-footer{margin-top:36px;padding:18px 0 0;border-top:1px solid #d9e2ec;color:#718096;font-size:13px;line-height:1.8}.brand-footer-mark{color:#175da4;font-size:16px;font-weight:700}.brand-slogan{margin-top:10px;color:#e27842}.article h1{font-size:28px;line-height:1.4;margin:0 0 28px;color:#0a152f}.article h2{margin:36px 0 16px;font-size:21px;line-height:1.5;border-left:4px solid #175da4;padding:7px 0 7px 12px;background:#f7f9fc;color:#0a152f}.article h3{font-size:17px;line-height:1.55;color:#175da4}.article p{margin:0 0 16px}.article blockquote{margin:20px 0;padding:12px 16px;border-left:4px solid #e27842;background:#fff8ed;color:#4b5563;line-height:1.8}.article pre{margin:18px 0;padding:14px 16px;overflow-x:auto;background:#f6f8fa;border:1px solid #e5e6eb;border-radius:5px;line-height:1.5;white-space:pre;font-size:12px}.article pre code{font-family:Menlo,Consolas,monospace;font-size:12px;white-space:pre}.article code{font-family:Menlo,Consolas,monospace;font-size:12px}.article img{max-width:100%;height:auto}.article table{border-collapse:collapse;width:100%;margin:18px 0;font-size:14px}.article th,.article td{border:1px solid #d9d9d9;padding:8px 10px;line-height:1.6}.article th{background:#f3f6f9;color:#0a152f}@media(max-width:600px){.article{margin:0;padding:26px 18px;font-size:16px}.article h1{font-size:25px}.article h2{font-size:20px}.hint{display:block;margin:8px 0 0}}
</style></head><body><div class="toolbar"><button class="copy" id="copy">原生复制正文</button><span class="hint" id="status">使用与 Cmd + C 相同的复制方式；图片请单独插入</span></div><main class="article" id="article">${brandHeader}${articleHtml}${brandFooter}</main>
<script>function copyNativeRichText(){const source=document.getElementById('article');const range=document.createRange();range.selectNodeContents(source);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);let ok=false;try{ok=document.execCommand('copy')}catch(e){}selection.removeAllRanges();return ok}
document.getElementById('copy').addEventListener('click',()=>{const status=document.getElementById('status');if(copyNativeRichText()){status.textContent='已按浏览器原生方式复制；图片请在公众号后台单独插入';}else{status.textContent='复制失败，请使用 Cmd + A（正文区域）后按 Cmd + C';}});</script></body></html>`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(output);
