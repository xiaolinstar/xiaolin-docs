import fs from 'fs';

// 清理文件中的控制字符
function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // 移除零宽字符
  content = content.replace(/[\u200B\u200C\u200D\u2060]/g, '');
  // 替换不换行空格为普通空格
  content = content.replace(/\u00A0/g, ' ');
  // 移除 BOM
  content = content.replace(/^\uFEFF/, '');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

const files = [
  'example-green-theme.html',
  'example-result.html', 
  'example-test.html',
  'example-with-extracted-config.html',
  'example-grace.html',
  'example-simple.html'
];

let cleaned = 0;
for (const file of files) {
  if (fs.existsSync(file) && cleanFile(file)) {
    console.log(`Cleaned: ${file}`);
    cleaned++;
  }
}

console.log(`\nTotal files cleaned: ${cleaned}`);
