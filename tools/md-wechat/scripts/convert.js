#!/usr/bin/env node

/**
 * Markdown 到微信公众号格式转换脚本 (Node.js 版本)
 * 
 * 完整支持：
 * - 基础 Markdown 语法
 * - 代码语法高亮 (highlight.js)
 * - 数学公式渲染 (KaTeX)
 * - Mermaid 流程图
 * - PlantUML 图表
 * - Infographic 信息图
 * - 扩展语法（删除线、高亮、下划线、Ruby注音等）
 *
 * 注意：本脚本只负责正文排版，渲染前会剥离 YAML frontmatter、`# 发布元数据`
 * 与 `# 发布 checklist`，只保留 `# 正文` 之后的段落。正文中的图片与表格
 * 不做公众号适配，需要图片/表格的稿件请走
 * content/dist/pipeline-basics/render-wechat.mjs。
 */

import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import katex from 'katex';
import juice from 'juice';
import { minify } from 'html-minifier-terser';
import { program } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 配置扩展语法 ====================

/**
 * 扩展语法处理器
 */
const extendedSyntaxExtensions = {
  // 删除线 ~~text~~
  strikethrough: {
    name: 'strikethrough',
    level: 'inline',
    start(src) {
      return src.indexOf('~~');
    },
    tokenizer(src, tokens) {
      const rule = /^~~([^~]+)~~/;
      const match = rule.exec(src);
      if (match) {
        return {
          type: 'strikethrough',
          raw: match[0],
          text: match[1]
        };
      }
    },
    renderer(token) {
      return `<s>${token.text}</s>`;
    }
  },
  
  // 高亮 ==text==
  highlight: {
    name: 'highlight',
    level: 'inline',
    start(src) {
      return src.indexOf('==');
    },
    tokenizer(src, tokens) {
      const rule = /^==([^=]+)==/;
      const match = rule.exec(src);
      if (match) {
        return {
          type: 'highlight',
          raw: match[0],
          text: match[1]
        };
      }
    },
    renderer(token) {
      return `<mark>${token.text}</mark>`;
    }
  },
  
  // 下划线 ++text++
  underline: {
    name: 'underline',
    level: 'inline',
    start(src) {
      return src.indexOf('++');
    },
    tokenizer(src, tokens) {
      const rule = /^\+\+([^\+]+)\+\+/;
      const match = rule.exec(src);
      if (match) {
        return {
          type: 'underline',
          raw: match[0],
          text: match[1]
        };
      }
    },
    renderer(token) {
      return `<u>${token.text}</u>`;
    }
  },
  
  // Ruby 注音 [文字]{注音}
  rubyBrace: {
    name: 'rubyBrace',
    level: 'inline',
    start(src) {
      const match = src.match(/\[([^\]]+)\]\{([^}]+)\}/);
      return match ? match.index : -1;
    },
    tokenizer(src, tokens) {
      const rule = /^\[([^\]]+)\]\{([^}]+)\}/;
      const match = rule.exec(src);
      if (match) {
        return {
          type: 'rubyBrace',
          raw: match[0],
          text: match[1],
          rt: match[2]
        };
      }
    },
    renderer(token) {
      return `<ruby>${token.text}<rt>${token.rt}</rt></ruby>`;
    }
  },
  
  // Ruby 注音 [文字]^(注音)
  rubyCaret: {
    name: 'rubyCaret',
    level: 'inline',
    start(src) {
      const match = src.match(/\[([^\]]+)\]\^\(([^)]+)\)/);
      return match ? match.index : -1;
    },
    tokenizer(src, tokens) {
      const rule = /^\[([^\]]+)\]\^\(([^)]+)\)/;
      const match = rule.exec(src);
      if (match) {
        return {
          type: 'rubyCaret',
          raw: match[0],
          text: match[1],
          rt: match[2]
        };
      }
    },
    renderer(token) {
      return `<ruby>${token.text}<rt>${token.rt}</rt></ruby>`;
    }
  }
};

// ==================== 数学公式渲染 ====================

/**
 * 渲染 KaTeX 数学公式
 */
function renderMath(formula, displayMode = false) {
  try {
    return katex.renderToString(formula, {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: false
    });
  } catch (e) {
    console.warn(chalk.yellow(`[WARN] 数学公式渲染失败: ${e.message}`));
    return displayMode 
      ? `<pre class="math-block">${formula}</pre>`
      : `<code class="math-inline">${formula}</code>`;
  }
}

/**
 * 数学公式扩展
 */
const mathExtension = {
  name: 'math',
  level: 'block',
  start(src) {
    // 检测 $$ 或 \[
    const match = src.match(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]/);
    return match ? match.index : -1;
  },
  tokenizer(src, tokens) {
    // 块级公式 $$...$$
    const blockRule = /^\$\$([\s\S]*?)\$\$/;
    let match = blockRule.exec(src);
    if (match) {
      return {
        type: 'math',
        raw: match[0],
        text: match[1].trim(),
        displayMode: true
      };
    }
    
    // LaTeX 标准格式 \[...\]
    const latexBlockRule = /^\\\[([\s\S]*?)\\\]/;
    match = latexBlockRule.exec(src);
    if (match) {
      return {
        type: 'math',
        raw: match[0],
        text: match[1].trim(),
        displayMode: true
      };
    }
  },
  renderer(token) {
    return renderMath(token.text, token.displayMode);
  }
};

/**
 * 行内数学公式扩展
 */
const inlineMathExtension = {
  name: 'inlineMath',
  level: 'inline',
  start(src) {
    // 检测 $...$ 或 \(...\)
    const match = src.match(/\$[^\$\n]+?\$|\\\([^)]+?\\\)/);
    return match ? match.index : -1;
  },
  tokenizer(src, tokens) {
    // 行内公式 $...$
    const inlineRule = /^\$([^\$\n]+?)\$/;
    let match = inlineRule.exec(src);
    if (match) {
      return {
        type: 'inlineMath',
        raw: match[0],
        text: match[1].trim(),
        displayMode: false
      };
    }
    
    // LaTeX 标准格式 \(...\)
    const latexInlineRule = /^\\\(([^)]+?)\\\)/;
    match = latexInlineRule.exec(src);
    if (match) {
      return {
        type: 'inlineMath',
        raw: match[0],
        text: match[1].trim(),
        displayMode: false
      };
    }
  },
  renderer(token) {
    return renderMath(token.text, token.displayMode);
  }
};

// ==================== Mermaid 图表渲染 ====================

let puppeteer = null;
let mermaidInitialized = false;

async function initPuppeteer() {
  if (!puppeteer) {
    try {
      puppeteer = (await import('puppeteer')).default;
    } catch (e) {
      console.warn(chalk.yellow('[WARN] Puppeteer 未安装，Mermaid 图表将显示为代码块'));
      return false;
    }
  }
  return true;
}

/**
 * 渲染 Mermaid 图表为 SVG
 */
async function renderMermaid(code) {
  const hasPuppeteer = await initPuppeteer();
  if (!hasPuppeteer) {
    return `<pre><code class="language-mermaid">${escapeHtml(code)}</code></pre>`;
  }
  
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-crash-reporter', '--user-data-dir=/tmp/md-wechat-chrome']
    });
    
    const page = await browser.newPage();
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
      </head>
      <body>
        <div id="container"></div>
        <script>
          mermaid.initialize({ startOnLoad: false, theme: 'default' });
        </script>
      </body>
      </html>
    `);
    
    const svg = await page.$eval('#container', async (container, code) => {
      const { svg } = await mermaid.render('mermaid-svg', code);
      container.innerHTML = svg;
      return container.innerHTML;
    }, code);
    
    return `<div class="mermaid-diagram">${svg}</div>`;
  } catch (e) {
    console.warn(chalk.yellow(`[WARN] Mermaid 渲染失败: ${e.message}`));
    return `<pre><code class="language-mermaid">${escapeHtml(code)}</code></pre>`;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Mermaid 图表扩展
 */
const mermaidExtension = {
  name: 'mermaid',
  level: 'block',
  start(src) {
    const match = src.match(/```mermaid\n/);
    return match ? match.index : -1;
  },
  tokenizer(src, tokens) {
    const rule = /^```mermaid\n([\s\S]*?)```/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: 'mermaid',
        raw: match[0],
        text: match[1].trim()
      };
    }
  },
  renderer(token) {
    // 同步渲染（初始占位），稍后异步替换
    return `<div class="mermaid-placeholder" data-code="${encodeURIComponent(token.text)}"></div>`;
  }
};

// ==================== 代码块处理 ====================

/**
 * 代码块扩展（带 Mac 风格装饰）
 */
const codeBlockExtension = {
  name: 'codeBlock',
  level: 'block',
  start(src) {
    return src.indexOf('```');
  },
  tokenizer(src, tokens) {
    const rule = /^```(\w*)\n([\s\S]*?)```/;
    const match = rule.exec(src);
    if (match) {
      // 排除 mermaid, plantuml, infographic
      const lang = match[1].toLowerCase();
      if (['mermaid', 'plantuml', 'infographic'].includes(lang)) {
        return;
      }
      return {
        type: 'codeBlock',
        raw: match[0],
        lang: match[1] || '',
        text: match[2].trim()
      };
    }
  },
  renderer(token) {
    const macStyle = '';
    
    let highlighted;
    if (token.lang && hljs.getLanguage(token.lang)) {
      try {
        highlighted = hljs.highlight(token.text, { language: token.lang }).value;
      } catch (e) {
        highlighted = escapeHtml(token.text);
      }
    } else {
      highlighted = escapeHtml(token.text);
    }
    
    const label = token.lang ? `<span style="display:block;margin:-2px 0 8px;color:#98a2b3;font:11px/1.2 Menlo,Consolas,monospace;text-transform:uppercase;">${token.lang}</span>` : '';
    return `<pre style="position:relative;background:#f6f8fa;color:#24292f;padding:14px 16px;border:1px solid #d8e1ea;border-radius:8px;overflow-x:auto;line-height:1.65;">${macStyle}${label}<code class="language-${token.lang}">${highlighted}</code></pre>`;
  }
};

// ==================== 主题样式 ====================

const BASE_CSS = `
/**
 * MD 基础主题样式
 */
section {
  font-family: var(--md-font-family);
  font-size: var(--md-font-size);
  line-height: 1.75;
  text-align: left;
  color: #333;
}

section > :first-child {
  margin-top: 0 !important;
}
`;

const DEFAULT_THEME_CSS = `
/**
 * MD 默认主题（经典主题）
 */

h1 {
  display: table;
  padding: 0 1em;
  border-bottom: 2px solid var(--md-primary-color);
  margin: 2em auto 1em;
  color: #333;
  font-size: 1.2em;
  font-weight: bold;
  text-align: center;
}

h2 {
  display: block;
  padding: 0.45em 0.7em;
  margin: 2em 8px 1em;
  color: #172b4d;
  background: #eef5fb;
  border-left: 4px solid var(--md-primary-color);
  font-size: 1.2em;
  font-weight: bold;
  text-align: left;
}

h3 {
  padding-left: 8px;
  border-left: 3px solid var(--md-primary-color);
  margin: 1.5em 8px 0.75em 0;
  color: #333;
  font-size: 1.1em;
  font-weight: bold;
}

h4 {
  margin: 1.5em 8px 0.5em;
  color: var(--md-primary-color);
  font-size: 1em;
  font-weight: bold;
}

p {
  margin: 1.2em 8px;
  letter-spacing: 0.1em;
  color: #333;
}

blockquote {
  font-style: normal;
  padding: 1em;
  border-left: 4px solid var(--md-primary-color);
  border-radius: 6px;
  color: #333;
  background: #f7f7f7;
  margin: 1em 8px;
}

blockquote p {
  margin: 0;
}

pre {
  font-size: 90%;
  overflow-x: auto;
  border-radius: 8px;
  padding: 1em;
  margin: 10px 8px;
  background: #f6f8fa;
  color: #24292f;
  border: 1px solid #d8e1ea;
}

pre code {
  background: none;
  padding: 0;
  color: inherit;
}

code {
  font-size: 90%;
  color: #d14;
  background: rgba(27, 31, 35, 0.05);
  padding: 3px 5px;
  border-radius: 4px;
}

/* 代码高亮颜色内联到 HTML，避免公众号粘贴后丢失外部 highlight.js 样式 */
.hljs-comment, .hljs-quote { color: #7f848e; }
.hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #c678dd; }
.hljs-string, .hljs-attr, .hljs-symbol { color: #98c379; }
.hljs-number, .hljs-literal, .hljs-variable { color: #d19a66; }
.hljs-title, .hljs-title.function_, .hljs-type { color: #61afef; }
.hljs-meta, .hljs-regexp { color: #56b6c2; }

s, del {
  text-decoration: line-through;
  color: #999;
}

mark {
  background: var(--md-primary-color);
  color: #fff;
  padding: 2px 4px;
  border-radius: 2px;
}

u {
  text-decoration: underline;
}

ruby {
  display: inline-ruby;
}

ruby rt {
  font-size: 0.65em;
  color: #666;
}

img {
  display: block;
  max-width: 100%;
  margin: 0.5em auto;
  border-radius: 4px;
}

figcaption {
  text-align: center;
  color: #888;
  font-size: 0.8em;
  margin-top: 0.5em;
}

ol, ul {
  padding-left: 1.5em;
  margin: 0.5em 8px;
  color: #333;
}

li {
  margin: 0.3em 0;
}

hr {
  border: none;
  border-top: 2px solid #eee;
  margin: 1.5em 0;
}

strong {
  color: var(--md-primary-color);
  font-weight: bold;
}

em {
  font-style: italic;
}

a {
  color: #576b95;
  text-decoration: none;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

th, td {
  border: 1px solid #ddd;
  padding: 0.5em;
  text-align: left;
}

th {
  background: #f5f5f5;
  font-weight: bold;
}

/* KaTeX 样式 */
.katex-display {
  margin: 1em 0;
  overflow-x: auto;
  text-align: center;
}

.katex {
  font-size: 1.1em;
}

/* Mermaid 图表 */
.mermaid-diagram {
  text-align: center;
  margin: 1em 0;
}

.mermaid-diagram svg {
  max-width: 100%;
  height: auto;
}
`;

const GRACE_THEME_CSS = `
/**
 * MD 优雅主题
 */

h1 {
  font-size: calc(var(--md-font-size) * 1.4);
  font-weight: bold;
  color: #333;
  margin: 2em 0 1em;
  padding-bottom: 0.5em;
  border-bottom: 2px solid var(--md-primary-color);
}

h2 {
  font-size: calc(var(--md-font-size) * 1.3);
  font-weight: bold;
  color: #333;
  margin: 1.8em 0 0.8em;
  padding: 0.3em 0;
  border-bottom: 1px solid #e8e8e8;
}

h3 {
  font-size: calc(var(--md-font-size) * 1.15);
  font-weight: bold;
  color: #333;
  margin: 1.5em 0 0.6em;
}

p {
  margin: 1em 0;
  line-height: 1.8;
  color: #333;
}

blockquote {
  margin: 1.2em 0;
  padding: 1em 1.5em;
  border-left: 4px solid var(--md-primary-color);
  background: #f9f9f9;
  color: #666;
}

pre {
  margin: 1.2em 0;
  padding: 1em;
  background: #f6f8fa;
  border-radius: 6px;
  overflow-x: auto;
}

code {
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 0.9em;
  color: #c7254e;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
}

a {
  color: var(--md-primary-color);
  text-decoration: none;
}

strong {
  color: var(--md-primary-color);
}
`;

const SIMPLE_THEME_CSS = `
/**
 * MD 简洁主题
 */

h1 {
  font-size: calc(var(--md-font-size) * 1.4);
  font-weight: bold;
  color: #333;
  margin: 2em 0 1em;
}

h2 {
  font-size: calc(var(--md-font-size) * 1.3);
  font-weight: bold;
  color: #333;
  margin: 1.8em 0 0.8em;
}

h3 {
  font-size: calc(var(--md-font-size) * 1.15);
  font-weight: bold;
  color: #333;
  margin: 1.5em 0 0.6em;
}

p {
  margin: 1em 0;
  line-height: 1.8;
  color: #333;
}

blockquote {
  margin: 1.2em 0;
  padding: 0.8em 1em;
  border-left: 3px solid #ddd;
  color: #666;
}

pre {
  margin: 1.2em 0;
  padding: 1em;
  background: #f5f5f5;
  border-radius: 4px;
  overflow-x: auto;
}

code {
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 0.9em;
  color: #c7254e;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
}

a {
  color: #0366d6;
  text-decoration: none;
}
`;

const TECH_CLEAN_THEME_CSS = `
/**
 * MD 技术简洁主题
 * 
 * 特点：极简配色，以灰度为主，标题层次通过字重和细微边框区分
 * 设计理念：克制、专业、易读
 */

h1 {
  font-size: calc(var(--md-font-size) * 1.4);
  font-weight: 600;
  color: #1a1a1a;
  margin: 2em 0 1em;
  padding-bottom: 0.5em;
  border-bottom: 1px solid #e8e8e8;
}

h2 {
  font-size: calc(var(--md-font-size) * 1.3);
  font-weight: 600;
  color: #1a1a1a;
  margin: 1.8em 0 0.8em;
}

h3 {
  font-size: calc(var(--md-font-size) * 1.15);
  font-weight: 600;
  color: #333;
  margin: 1.5em 0 0.6em;
}

h4 {
  font-size: calc(var(--md-font-size) * 1.05);
  font-weight: 600;
  color: #333;
  margin: 1.2em 0 0.5em;
}

h5 {
  font-size: var(--md-font-size);
  font-weight: 600;
  color: #666;
  margin: 1em 0 0.4em;
}

h6 {
  font-size: var(--md-font-size);
  font-weight: 600;
  color: #999;
  margin: 1em 0 0.4em;
}

p {
  margin: 1em 0;
  line-height: 1.8;
  color: #333;
}

blockquote {
  margin: 1.2em 0;
  padding: 0.8em 1em;
  border-left: 3px solid #d9d9d9;
  background: #fafafa;
  color: #666;
}

blockquote p {
  margin: 0.5em 0;
}

pre {
  margin: 1.2em 0;
  padding: 1em;
  background: #f6f7f8;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.6;
}

pre code {
  background: none;
  padding: 0;
  color: inherit;
  font-size: inherit;
}

code {
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 0.9em;
  color: #c7254e;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
}

ul, ol {
  margin: 1em 0;
  padding-left: 2em;
  color: #333;
}

li {
  margin: 0.4em 0;
  line-height: 1.8;
}

a {
  color: #1890ff;
  text-decoration: none;
}

strong {
  font-weight: 600;
  color: #1a1a1a;
}

em {
  font-style: italic;
}

img {
  max-width: 100%;
  height: auto;
  margin: 1.5em 0;
  border-radius: 4px;
}

table {
  width: 100%;
  margin: 1.5em 0;
  border-collapse: collapse;
  font-size: 14px;
}

th, td {
  padding: 0.75em;
  border: 1px solid #e8e8e8;
  text-align: left;
}

th {
  background: #fafafa;
  font-weight: 600;
  color: #333;
}

td {
  color: #666;
}

hr {
  border: none;
  border-top: 1px solid #e8e8e8;
  margin: 2em 0;
}

s, del {
  text-decoration: line-through;
  color: #999;
}

mark {
  background: #fff3cd;
  color: #333;
  padding: 2px 4px;
  border-radius: 2px;
}

.hljs-comment, .hljs-quote { 
  color: #8c8c8c; 
  font-style: italic;
}

.hljs-keyword, .hljs-selector-tag { 
  color: #722ed1; 
}

.hljs-string, .hljs-attr { 
  color: #13c2c2; 
}

.hljs-number, .hljs-literal { 
  color: #fa8c16; 
}

.hljs-title, .hljs-type { 
  color: #1890ff; 
}
`;

const THEME_MAP = {
  'default': DEFAULT_THEME_CSS,
  'grace': GRACE_THEME_CSS,
  'simple': SIMPLE_THEME_CSS,
  'tech-clean': TECH_CLEAN_THEME_CSS
};

// ==================== 核心转换器 ====================

class MDToWechatConverter {
  constructor(config = {}) {
    // 支持嵌套配置结构（从配置文件加载）
    this.config = {
      ...config,
      // 从扁平配置或嵌套配置中提取（覆盖 spread 的值）
      theme: config.theme?.name || config.theme || 'default',
      primaryColor: config.style?.primaryColor || config.primaryColor || '#0F4C81',
      fontFamily: config.style?.fontFamily || config.fontFamily || '-apple-system-font, BlinkMacSystemFont, Helvetica Neue, PingFang SC, sans-serif',
      fontSize: config.style?.fontSize || config.fontSize || '16px',
      textColor: config.style?.textColor || config.textColor || '#3f3f3f',
      bgColor: config.style?.bgColor || config.bgColor || '#ffffff',
      lineHeight: config.style?.lineHeight || config.lineHeight || 1.75,
      codeTheme: config.codeBlock?.themeName || config.codeTheme || 'atom-one-dark',
      macStyleCode: config.codeBlock?.isMacStyle !== false && config.macStyleCode !== false,
      showWordCount: config.content?.countStatus || config.showWordCount || false,
      useIndent: config.content?.useIndent || false,
      useJustify: config.content?.useJustify || false,
      padding: config.content?.padding || '20px',
      linkColor: config.link?.color || config.linkColor || config.style?.primaryColor || '#0F4C81',
      imageBorderRadius: config.image?.borderRadius || '4px',
      customCSS: config.customCSS || '',
      headingStyles: config.headingStyles || {},
    };
    
    this.setupMarked();
  }
  
  setupMarked() {
    // 注册扩展（先注册，优先级高）
    marked.use({
      extensions: [
        // 特殊代码块扩展（优先于普通代码块）
        mermaidExtension,
        // 扩展语法
        extendedSyntaxExtensions.strikethrough,
        extendedSyntaxExtensions.highlight,
        extendedSyntaxExtensions.underline,
        extendedSyntaxExtensions.rubyBrace,
        extendedSyntaxExtensions.rubyCaret,
        // 数学公式
        mathExtension,
        inlineMathExtension,
        // 普通代码块（最后处理）
        codeBlockExtension
      ],
      renderer: {
        // 自定义代码块渲染，处理 mermaid 等特殊语言
        code(code, language) {
          // 特殊语言直接返回代码块
          if (['mermaid', 'plantuml', 'infographic'].includes(language)) {
            // 这些由扩展处理，这里只是后备
            const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<pre><code class="language-${language}">${escaped}</code></pre>`;
          }
          
          // 普通代码块使用 highlight.js
          let highlighted;
          if (language && hljs.getLanguage(language)) {
            try {
              highlighted = hljs.highlight(code, { language }).value;
            } catch (e) {
              highlighted = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
          } else {
            highlighted = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          }
          
          const macStyle = '';
          
          const label = language ? `<span style="display:block;margin:-2px 0 8px;color:#98a2b3;font:11px/1.2 Menlo,Consolas,monospace;text-transform:uppercase;">${language}</span>` : '';
          return `<pre style="position:relative;background:#f6f8fa;color:#24292f;padding:14px 16px;border:1px solid #d8e1ea;border-radius:8px;overflow-x:auto;line-height:1.65;">${macStyle}${label}<code class="language-${language || ''}">${highlighted}</code></pre>`;
        }
      }
    });
  }
  
  async convert(markdownText) {
    // 1. 解析 Markdown
    let html = await marked.parse(markdownText);
    
    // 2. 渲染 Mermaid 图表
    html = await this.renderMermaidPlaceholders(html);
    
    // 3. 生成并解析 CSS 变量（juice 不支持 var()）
    let css = this.generateCSS();
    css = resolveCSSVariables(css, this.config);
    
    // 4. 构建文章 HTML 并用 juice 内联所有样式
    const articleHTML = this.buildArticleHTML(html, css);
    const inlinedHTML = juice(articleHTML, {
      applyStyleTags: true,
      removeStyleTags: true,
      preserveMediaQueries: false,
      preserveFontFaces: false,
      webResources: { images: false, scripts: false, styles: false, links: false },
    });
    
    // 5. 包装为完整页面（含复制按钮）
    const pageHTML = this.wrapPageHTML(inlinedHTML);
    
    // 6. 清理不可见控制字符
    return pageHTML
      .replace(/[\u200B\u200C\u200D\u2060]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/^\uFEFF/, '');
  }
  
  async renderMermaidPlaceholders(html) {
    const placeholderRegex = /<div class="mermaid-placeholder" data-code="([^"]+)"><\/div>/g;
    const replacements = [];
    let match;
    
    while ((match = placeholderRegex.exec(html)) !== null) {
      const code = decodeURIComponent(match[1]);
      replacements.push({
        placeholder: match[0],
        svg: await renderMermaid(code)
      });
    }
    
    for (const { placeholder, svg } of replacements) {
      html = html.replace(placeholder, svg);
    }
    
    return html;
  }
  
  generateCSS() {
    const cssVars = `
:root {
  --md-primary-color: ${this.config.primaryColor};
  --md-font-family: ${this.config.fontFamily};
  --md-font-size: ${this.config.fontSize};
  --md-text-color: ${this.config.textColor};
  --md-bg-color: ${this.config.bgColor};
  --md-line-height: ${this.config.lineHeight};
  --md-link-color: ${this.config.linkColor || this.config.primaryColor};
  --md-image-radius: ${this.config.imageBorderRadius};
}
`;

    // 标题样式定制
    let headingCSS = '';
    const headingSizes = {
      h1: '1.8em',
      h2: '1.5em',
      h3: '1.25em',
      h4: '1em',
      h5: '0.875em',
      h6: '0.85em'
    };
    
    for (const [tag, size] of Object.entries(headingSizes)) {
      const style = this.config.headingStyles?.[tag];
      if (style && style !== 'default') {
        // 自定义标题样式可以在这里扩展
        headingCSS += `
${tag} {
  font-size: ${size};
  color: ${this.config.primaryColor};
}`;
      }
    }
    
    // 文本对齐样式
    let textIndentCSS = '';
    if (this.config.useIndent) {
      textIndentCSS = `
p {
  text-indent: 2em;
}`;
    }
    
    let justifyCSS = '';
    if (this.config.useJustify) {
      justifyCSS = `
section, p {
  text-align: justify;
}`;
    }
    
    // 合并自定义 CSS
    const themeCSS = THEME_MAP[this.config.theme] || DEFAULT_THEME_CSS;
    return BASE_CSS + cssVars + themeCSS + headingCSS + textIndentCSS + justifyCSS + '\n' + this.config.customCSS;
  }
  
  buildArticleHTML(content, css) {
    let wordCountInfo = '';
    if (this.config.showWordCount) {
      const textOnly = content.replace(/<[^>]+>/g, '');
      const words = textOnly.length;
      const minutes = Math.max(1, Math.floor(words / 400));
      wordCountInfo = `<blockquote style="border-left:4px solid ${this.config.primaryColor};padding:1em;background:#f7f7f7;"><p style="margin:0;">字数 ${words}，阅读大约需 ${minutes} 分钟</p></blockquote>`;
    }
    
    return `<div id="wechat-article">
<style>
section {
  font-family: ${this.config.fontFamily};
  font-size: ${this.config.fontSize};
  line-height: ${this.config.lineHeight};
  text-align: left;
  color: ${this.config.textColor};
}
section > :first-child { margin-top: 0 !important; }
${css}
</style>
<section style="margin:0 auto;padding:${this.config.padding};max-width:100%;">
${wordCountInfo}
${content}
</section>
</div>`;
  }
  
  wrapPageHTML(articleHTML) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>微信公众号文章</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
</head>
<body style="margin:0;padding:0;background:${this.config.bgColor};">
<div style="position:sticky;top:0;z-index:10;padding:10px;text-align:center;background:#ffffff;border-bottom:1px solid #e5e7eb;">
  <button id="copy-wechat" style="border:0;border-radius:6px;padding:9px 18px;background:${this.config.primaryColor};color:#fff;font-size:14px;cursor:pointer;">复制正文</button>
  <span id="copy-status" style="margin-left:10px;color:#667085;font-size:13px;">点击后粘贴到微信公众号编辑器</span>
</div>
${articleHTML}
<script>
document.getElementById('copy-wechat').addEventListener('click', async () => {
  const article = document.getElementById('wechat-article');
  const status = document.getElementById('copy-status');
  const html = article.innerHTML;
  const text = article.innerText;
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      })]);
    } else {
      const range = document.createRange();
      range.selectNodeContents(article);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('copy');
      selection.removeAllRanges();
    }
    status.textContent = '已复制，打开公众号正文区粘贴';
  } catch (error) {
    status.textContent = '自动复制失败，请选中正文后按 Cmd/Ctrl + C';
  }
});
</script>
</body>
</html>`;
  }
}

// ==================== CSS 变量解析 ====================

/**
 * 解析 CSS 中的变量定义，替换 var(--xxx) 为实际值
 * juice 不支持 CSS 变量，必须在内联前预处理
 */
function resolveCSSVariables(css, config) {
  const varMap = {
    '--md-primary-color': config.primaryColor,
    '--md-font-family': config.fontFamily,
    '--md-font-size': config.fontSize,
    '--md-text-color': config.textColor,
    '--md-bg-color': config.bgColor,
    '--md-line-height': String(config.lineHeight),
    '--md-link-color': config.linkColor || config.primaryColor,
    '--md-image-radius': config.imageBorderRadius,
  };
  
  // 先从 :root 块中提取变量定义
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
  if (rootMatch) {
    const rootContent = rootMatch[1];
    const varDefRegex = /(--[\w-]+)\s*:\s*([^;]+)/g;
    let match;
    while ((match = varDefRegex.exec(rootContent)) !== null) {
      varMap[match[1]] = match[2].trim();
    }
  }
  
  // 替换所有 var(--xxx) 引用
  let resolved = css.replace(/var\((--[\w-]+)\)/g, (_, name) => {
    return varMap[name] || 'inherit';
  });
  
  // 移除 :root 块（已无用）
  resolved = resolved.replace(/:root\s*\{[^}]*\}/g, '');
  
  return resolved;
}

// ==================== 工具函数 ====================

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * 剥离发布辅助内容，只保留公众号正文。
 *
 * wechat.md 同时承载发布元数据（标题备选、摘要、关键词）与正文，
 * 直接交给 marked 会把内部字段渲染成文章标题，2026-10-28 生成的
 * wechat.html 即为此类产物，不可直接粘贴到公众号。
 */
function prepareWechatMarkdown(markdownText) {
  let body = markdownText.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

  // 从 `# 正文（粘贴到公众号后台）` 之后开始渲染
  const bodyMarker = /^#\s*正文[^\n]*\r?\n?/m.exec(body);
  if (bodyMarker) {
    body = body.slice(bodyMarker.index + bodyMarker[0].length);
  }

  // 丢弃文末的内部发布 checklist
  const checklistIndex = body.search(/^#\s*发布\s*checklist/m);
  if (checklistIndex !== -1) {
    body = body.slice(0, checklistIndex);
  }

  return body.trimStart();
}

async function loadConfig(configPath) {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return {};
  }
}

async function ensureDependencies() {
  const deps = ['marked', 'highlight.js', 'katex', 'juice', 'commander', 'chalk'];
  const missing = [];
  
  for (const dep of deps) {
    try {
      await import(dep.replace('.js', '-js'));
    } catch (e) {
      missing.push(dep);
    }
  }
  
  if (missing.length > 0) {
    console.log(chalk.cyan(`[INFO] 检测到缺失依赖: ${missing.join(', ')}`));
    console.log(chalk.cyan('[INFO] 正在安装依赖...'));
    
    const { execSync } = await import('child_process');
    try {
      execSync(`npm install ${missing.join(' ')}`, { stdio: 'inherit' });
      console.log(chalk.green('[OK] 依赖安装完成'));
    } catch (e) {
      console.error(chalk.red(`[ERROR] 依赖安装失败: ${e.message}`));
      process.exit(1);
    }
  }
}

// ==================== 命令行接口 ====================

program
  .name('md-wechat')
  .description('将 Markdown 转换为微信公众号格式')
  .version('2.0.0')
  .argument('<input>', '输入 Markdown 文件路径')
  .option('-o, --output <path>', '输出 HTML 文件路径')
  .option('-c, --config <path>', '配置文件路径', 'md-config.json')
  .option('--no-auto-install', '禁用自动安装缺失的依赖')
  .option('--theme <name>', '主题名称 (default/grace/simple)')
  .option('--color <color>', '主题颜色 (覆盖配置文件)')
  .option('--font <font>', '字体系列')
  .option('--font-size <size>', '字体大小')
  .option('--bg-color <color>', '背景颜色')
  .option('--text-color <color>', '文本颜色')
  .action(async (input, options) => {
    try {
      // 检查依赖
      if (options.autoInstall !== false) {
        await ensureDependencies();
      }
      
      // 读取输入文件
      const inputPath = path.resolve(input);
      const markdownText = await fs.readFile(inputPath, 'utf-8');
      
      // 加载配置
      const configPath = path.resolve(options.config);
      let config = await loadConfig(configPath);
      
      // 命令行参数覆盖配置文件
      if (options.theme) config.theme = options.theme;
      if (options.color) {
        config.style = config.style || {};
        config.style.primaryColor = options.color;
      }
      if (options.font) {
        config.style = config.style || {};
        config.style.fontFamily = options.font;
      }
      if (options.fontSize) {
        config.style = config.style || {};
        config.style.fontSize = options.fontSize;
      }
      if (options.bgColor) {
        config.style = config.style || {};
        config.style.bgColor = options.bgColor;
      }
      if (options.textColor) {
        config.style = config.style || {};
        config.style.textColor = options.textColor;
      }
      
      console.log(chalk.cyan('[INFO] 开始转换...'));
      if (Object.keys(config).length > 0) {
        console.log(chalk.gray(`  配置文件: ${options.config}`));
        console.log(chalk.gray(`  主题: ${config.theme?.name || config.theme || 'default'}`));
        if (config.style?.primaryColor) {
          console.log(chalk.gray(`  主色调: ${config.style.primaryColor}`));
        }
      }
      
      // 只渲染正文，避免 frontmatter 与发布元数据进入公众号正文
      const bodyText = prepareWechatMarkdown(markdownText);
      if (/!\[[^\]]*\]\(/.test(bodyText) || /^\s*\|.*\|\s*$/m.test(bodyText)) {
        console.warn(chalk.yellow('[WARN] 正文含图片或表格：本脚本不做公众号适配，请改用 render-wechat.mjs 生成正式稿'));
      }

      // 转换
      const converter = new MDToWechatConverter(config);
      const html = await converter.convert(bodyText);
      
      // 确定输出路径
      let outputPath = options.output;
      if (!outputPath) {
        const parsed = path.parse(inputPath);
        outputPath = path.join(parsed.dir, `${parsed.name}-wechat.html`);
      }
      outputPath = path.resolve(outputPath);
      
      // 写入文件
      await fs.writeFile(outputPath, html, 'utf-8');
      
      console.log(chalk.green(`[OK] 转换完成: ${outputPath}`));
      
    } catch (e) {
      console.error(chalk.red(`[ERROR] 转换失败: ${e.message}`));
      process.exit(1);
    }
  });

program.parse();
