import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { reviewWechat } from './lib/wechat-review.mjs';

const header = '![AI持续运维站点鸟图](https://media.xiaolin.fun/docs/wechat-theme/ai-ops-mascot.png)\n\n# 测试文章\n\n';
const longCode = '```bash\n' + 'echo ok\n'.repeat(21) + '```\n';
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wechat-review-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const output = path.join(dir, 'wechat.html');
  const reportPath = path.join(dir, 'wechat-review.json');
  const read = () => JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const review = (content, extra = {}) => reviewWechat({ source: content, content, output, engine: 'native', ...extra });
  const approve = () => {
    const report = read();
    report.approval = {
      source_hash: report.source_hash, policy_hash: report.policy_hash,
      issue_ids: report.issues.map(issue => issue.id), reviewer: '测试审核人',
      reason: '测试夹具模拟已明确认可的例外。', reviewed_at: '2026-11-05T12:00:00Z',
    };
    fs.writeFileSync(reportPath, JSON.stringify(report));
  };
  return { dir, output, reportPath, read, review, approve };
}

test('正常正文通过；正文模板缺失不能人工豁免', t => {
  const f = fixture(t);
  assert.equal(f.review(header + '正文。').status, 'passed');
  assert.throws(() => f.review('# 发布元数据\n\n# 正文\n'));
  f.approve();
  assert.throws(() => f.review('# 发布元数据\n\n# 正文\n'));
  assert.equal(f.read().status, 'failed');
});

test('SLA 超限先失败；完整人工认可后通过，改稿后失效', t => {
  const f = fixture(t);
  const content = header + longCode;
  assert.throws(() => f.review(content));
  assert.equal(f.read().status, 'failed');
  f.approve();
  assert.equal(f.review(content).status, 'manual_passed');
  assert.equal(f.review(content, { meta: { platforms: { wechat: { status: 'ready' } } } }).status, 'manual_passed');
  assert.throws(() => f.review(content + '\n新增文字。'));
  assert.equal(f.read().approval_valid, false);
});

test('人工认可必须覆盖全部例外，且元数据、规则与渲染入口一致', t => {
  const f = fixture(t), content = header + longCode;
  assert.throws(() => f.review(content));
  for (const mutate of [
    approval => { approval.issue_ids = []; },
    approval => { approval.policy_hash = '旧规则'; },
    approval => { approval.reason = ''; },
  ]) {
    f.approve();
    const report = f.read(); mutate(report.approval);
    fs.writeFileSync(f.reportPath, JSON.stringify(report));
    assert.throws(() => f.review(content));
  }
  f.approve();
  assert.throws(() => f.review(content, { meta: { summary: '新摘要' } }));
  f.approve();
  assert.throws(() => f.review(content, { engine: 'standard' }));
});

test('备用渲染器保留图片与链接属性，失败时保留正式 HTML', t => {
  const f = fixture(t), input = path.join(f.dir, 'wechat.md');
  const run = () => spawnSync(process.execPath, ['scripts/render-wechat-native.mjs', input], { encoding: 'utf8' });
  fs.writeFileSync(input, header + '![图片](https://example.com/p.png "图片标题")\n\n[参考](https://example.com/ref "链接标题")\n');
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  const html = fs.readFileSync(f.output, 'utf8');
  assert.match(html, /src="https:\/\/example.com\/p.png"/);
  assert.match(html, /alt="图片"/);
  assert.match(html, /title="图片标题"/);
  assert.match(html, /href="https:\/\/example.com\/ref"/);
  const check = () => spawnSync(process.execPath, ['scripts/check-wechat-render.mjs', f.dir], { encoding: 'utf8' });
  assert.equal(check().status, 0);
  fs.appendFileSync(input, '\n新正文。');
  const stale = check();
  assert.notEqual(stale.status, 0);
  assert.match(stale.stderr, /审核报告已过期/);
  fs.writeFileSync(input, header + longCode);
  result = run();
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(f.output, 'utf8'), html);
  f.approve();
  result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.read().status, 'manual_passed');
});
