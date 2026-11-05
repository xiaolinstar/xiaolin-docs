import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const root = fileURLToPath(new URL('../../', import.meta.url));

export function resolveWechatOutput(input, explicitOutput) {
  if (!input) return undefined;
  const source = path.resolve(input);
  let output = explicitOutput;
  if (!output && source.startsWith(path.join(root, 'docs') + path.sep)) {
    const dist = path.join(root, 'content/dist');
    const matches = fs.readdirSync(dist, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(dist, entry.name))
      .filter(dir => {
        const meta = path.join(dir, 'meta.yaml');
        if (!fs.existsSync(meta)) return false;
        const { data } = matter(`---\n${fs.readFileSync(meta, 'utf8')}\n---\n`);
        return data.origin && path.resolve(root, data.origin) === source;
      });
    if (matches.length !== 1) throw new Error('原文必须对应唯一分发目录，请检查 meta.yaml 或指定 wechat.html 输出路径。');
    output = path.join(matches[0], 'wechat.html');
  }
  output ??= path.join(path.dirname(source), 'wechat.html');
  if (path.basename(output) !== 'wechat.html') throw new Error('正式 HTML 必须命名为 wechat.html。');
  const resolved = path.resolve(output);
  if (resolved.startsWith(path.join(root, 'docs') + path.sep)) throw new Error('分发 HTML 不应写入 docs/，请指定 content/dist/ 下的输出路径。');
  return resolved;
}
