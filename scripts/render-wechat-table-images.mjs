import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const sourcePath = process.argv[2] ?? 'docs/sre/devops/foundation/git-github.md';
const outputDir = process.argv[3] ?? 'docs/public/images/img-git-github';
const source = fs.readFileSync(sourcePath, 'utf8');
const lines = source.split('\n');
const tables = [];

for (let index = 0; index < lines.length; index += 1) {
  if (!/^\|/.test(lines[index]) || !/^\|\s*:?-+/.test(lines[index + 1] ?? '')) continue;
  const split = (line) => line.split('|').slice(1, -1).map((cell) => cell.trim().replace(/`/g, '').replace(/\*\*/g, ''));
  const table = { headers: split(lines[index]), rows: [] };
  index += 2;
  while (/^\|/.test(lines[index] ?? '')) {
    table.rows.push(split(lines[index]));
    index += 1;
  }
  tables.push(table);
}

const escape = (value) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const textWidth = (value) => [...value].reduce((width, character) => width + (/^[\x00-\xff]$/.test(character) ? 0.56 : 1), 0);
const wrap = (value, maxWidth) => {
  const rows = [];
  let row = '';
  let width = 0;
  for (const character of [...value]) {
    const next = /^[\x00-\xff]$/.test(character) ? 0.56 : 1;
    if (row && width + next > maxWidth) { rows.push(row); row = ''; width = 0; }
    row += character;
    width += next;
  }
  if (row) rows.push(row);
  return rows.length ? rows : [''];
};
const cellText = (value, x, y, width, color, weight) => {
  const wrapped = wrap(value, Math.max(7, (width - 18) / 16));
  return `<text x="${x + 9}" y="${y + 23}" fill="${color}" font-family="PingFang SC,Microsoft YaHei,Arial,sans-serif" font-size="16" font-weight="${weight}">${wrapped.map((line, index) => `<tspan x="${x + 9}" dy="${index ? 25 : 0}">${escape(line)}</tspan>`).join('')}</text>`;
};

fs.mkdirSync(outputDir, { recursive: true });
for (const [tableIndex, table] of tables.entries()) {
  const width = 1080;
  const margin = 24;
  const inner = width - margin * 2;
  const ratios = [0.25, 0.31, 0.44];
  const columns = ratios.map((ratio) => Math.floor(inner * ratio));
  columns[2] = inner - columns[0] - columns[1];
  const rows = [table.headers, ...table.rows].map((row, rowIndex) => {
    const lineCount = Math.max(...row.map((cell, column) => wrap(cell, Math.max(7, (columns[column] - 18) / 16)).length));
    return { row, height: Math.max(rowIndex === 0 ? 46 : 50, lineCount * 25 + 22), header: rowIndex === 0 };
  });
  const height = margin * 2 + rows.reduce((sum, row) => sum + row.height, 0);
  let y = margin;
  const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`, '<rect width="100%" height="100%" fill="#ffffff"/>'];
  for (const row of rows) {
    let x = margin;
    svg.push(`<rect x="${margin}" y="${y}" width="${inner}" height="${row.height}" fill="${row.header ? '#f3f7fb' : '#ffffff'}"/>`);
    svg.push(`<line x1="${margin}" y1="${y}" x2="${margin + inner}" y2="${y}" stroke="#d9e2ec" stroke-width="1"/>`);
    row.row.forEach((cell, column) => {
      svg.push(cellText(cell, x, y, columns[column], row.header ? '#175da4' : '#172033', row.header || column === 0 ? '700' : '400'));
      x += columns[column];
    });
    y += row.height;
  }
  svg.push(`<line x1="${margin}" y1="${y}" x2="${margin + inner}" y2="${y}" stroke="#d9e2ec" stroke-width="1"/>`, '</svg>');
  const base = `wechat-table-${String(tableIndex + 1).padStart(2, '0')}`;
  const svgPath = path.join(outputDir, `${base}.svg`);
  const pngPath = path.join(outputDir, `${base}.png`);
  fs.writeFileSync(svgPath, svg.join(''));
  execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${width},${height}`, `--screenshot=${pngPath}`, pathToFileURL(path.resolve(svgPath)).href], { stdio: 'ignore' });
  fs.unlinkSync(svgPath);
  console.log(pngPath);
}
