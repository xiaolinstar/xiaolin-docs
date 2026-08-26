import fs from 'fs';

const files = ['skill.md', 'SKILL.md', 'README.md', 'README_EN.md'];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  
  const content = fs.readFileSync(file, 'utf-8');
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
      controlChars.push({pos: i, code: code, hex: '0x' + code.toString(16), char: String.fromCharCode(code)});
    }
  }
  
  if (controlChars.length > 0) {
    console.log(`\n${file}: Found ${controlChars.length} control characters`);
    controlChars.slice(0, 10).forEach(c => {
      console.log(`  Position ${c.pos}: ${c.hex} (${c.char || 'invisible'})`);
    });
  } else {
    console.log(`${file}: OK`);
  }
}
