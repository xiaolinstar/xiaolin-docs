import fs from 'fs';
import path from 'path';

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const controlChars = [];
  
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    
    // 控制字符 (除制表符、换行符、回车符)
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      controlChars.push({pos: i, code: code, hex: '0x' + code.toString(16)});
    }
    
    // 零宽字符和其他不可见字符
    if (code === 0x200B || code === 0x200C || code === 0x200D || 
        code === 0xFEFF || code === 0x00A0 || code === 0x2060 ||
        (code >= 0x202A && code <= 0x202E)) {
      controlChars.push({pos: i, code: code, hex: '0x' + code.toString(16)});
    }
  }
  
  return controlChars;
}

function scanDir(dir) {
  const results = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      if (file.name !== 'node_modules' && file.name !== '.git') {
        results.push(...scanDir(fullPath));
      }
    } else if (file.name.endsWith('.md') || file.name.endsWith('.html')) {
      const chars = scanFile(fullPath);
      if (chars.length > 0) {
        results.push({file: fullPath, count: chars.length, chars: chars.slice(0, 5)});
      }
    }
  }
  
  return results;
}

const results = scanDir('.');
if (results.length > 0) {
  console.log('Files with control characters:\n');
  results.forEach(r => {
    console.log(`${r.file}: ${r.count} control characters`);
    r.chars.forEach(c => console.log(`  pos ${c.pos}: ${c.hex}`));
  });
} else {
  console.log('No control characters found in any .md or .html files');
}
