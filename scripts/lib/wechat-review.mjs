import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import MarkdownIt from 'markdown-it';

const mascot = 'https://media.xiaolin.fun/docs/wechat-theme/ai-ops-mascot.png';
const digest = value => createHash('sha256').update(value).digest('hex');
const policyHash = digest([
  ...['./wechat-review.mjs', '../render-wechat.mjs', '../render-wechat-native.mjs',
    '../../.agents/skills/creator-suite/wechat-publisher/references/format-collection.md']
    .map(file => fs.readFileSync(new URL(file, import.meta.url), 'utf8')),
].join('\n'));

// 静态预检不代表微信端验收。只有 SLA 例外可由人工认可，结构错误不可豁免。
export function inspectWechat(content, summary = '') {
  const tokens = new MarkdownIt({ html: false }).parse(content, {});
  const issues = [];
  const add = (code, token, message, kind = 'sla') => issues.push({
    id: `${code}:${token?.map?.[0] + 1 || 0}`, kind,
    line: token?.map?.[0] + 1 || null, message,
  });
  const first = tokens[1];
  if (tokens[0]?.type !== 'paragraph_open' || first?.children?.length !== 1
    || first.children[0].type !== 'image' || first.children[0].attrGet('src') !== mascot) {
    add('header', tokens[0], '正文必须以固定站点鸟图开头。', 'structure');
  }
  if (tokens[3]?.type !== 'heading_open' || tokens[3].tag !== 'h1'
    || tokens.filter(t => t.type === 'heading_open' && t.tag === 'h1').length !== 1) {
    add('title', tokens[3], '抬头图后须有且仅有一个文章 H1。', 'structure');
  }
  if ([...summary].length > 120) add('summary-length', null, `摘要 ${[...summary].length} 字，超过 120 字。`);
  for (const token of tokens) {
    if (token.type === 'heading_open' && !['h1', 'h2', 'h3'].includes(token.tag)) {
      add('heading-level', token, `不支持 ${token.tag} 标题。`, 'structure');
    }
    if (token.type === 'fence') {
      const lines = token.content.trimEnd().split('\n');
      if (lines.length > 20) add('code-lines', token, `代码块 ${lines.length} 行，超过 20 行。`);
      const longest = Math.max(...lines.map(line => [...line].length));
      if (longest > 72) add('code-width', token, `代码行最长 ${longest} 字符，超过 72 字符。`);
    }
    for (const child of token.children ?? []) {
      if (child.type === 'image' && [...child.content].length > 40) {
        add('caption-length', token, `图注 ${[...child.content].length} 字，超过 40 字。`);
      }
    }
    if (token.type === 'heading_open' && /发布元数据|发布 checklist|文末收尾|正文（粘贴/.test(tokens[tokens.indexOf(token) + 1]?.content ?? '')) {
      add('editorial-section', token, '发布元数据与 checklist 不应出现在正文中。', 'structure');
    }
  }
  return issues;
}

export function reviewWechat({ source, content, summary, meta = {}, output, engine, writeReport = true }) {
  if (!['standard', 'native'].includes(engine)) throw new Error('未知公众号渲染入口。');
  const reportPath = path.join(path.dirname(output), 'wechat-review.json');
  // 发布状态及 checklist 不改变渲染内容，不应使独立的 SLA 认可失效。
  const sourceHash = digest(JSON.stringify({ source, engine, render_meta: {
    summary: summary ?? meta.summary ?? '', origin_url: meta.origin_url ?? '', slug: meta.slug ?? '',
  } }));
  const issues = inspectWechat(content, summary);
  let approval = null;
  if (fs.existsSync(reportPath)) {
    try { approval = JSON.parse(fs.readFileSync(reportPath, 'utf8')).approval; } catch {}
  }
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const manual = issues.length > 0 && issues.every(issue => issue.kind === 'sla')
    && approval?.source_hash === sourceHash && approval?.policy_hash === policyHash
    && ['reviewer', 'reason', 'reviewed_at'].every(key => text(approval[key]))
    && !Number.isNaN(Date.parse(approval.reviewed_at))
    && Array.isArray(approval.issue_ids)
    && issues.every(issue => approval.issue_ids.includes(issue.id));
  const status = !issues.length ? 'passed' : manual ? 'manual_passed' : 'failed';
  const report = {
    status, source_hash: sourceHash, policy_hash: policyHash, engine,
    checked_at: new Date().toISOString(), issues, approval: approval ?? null, approval_valid: Boolean(manual),
    scope: '静态检查：正文结构、摘要 120 字、代码 20 行/72 字符、图注 40 字；其余格式及微信端显示仍需人工核对。',
  };
  if (writeReport) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  }
  const labels = { failed: '不通过', passed: '通过', manual_passed: '人工通过' };
  console.log(`公众号静态检查：${labels[status]}；报告：${reportPath}`);
  for (const issue of issues) console.error(`${issue.id} ${issue.message}`);
  if (status === 'failed') throw new Error('检查不通过，正式 HTML 未覆盖；请修改稿件或提交具体 SLA 例外供人工审核。');
  return report;
}
