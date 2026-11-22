import hljs from 'highlight.js/lib/core';
import java from 'highlight.js/lib/languages/java';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import csharp from 'highlight.js/lib/languages/csharp';
import kotlin from 'highlight.js/lib/languages/kotlin';
import cpp from 'highlight.js/lib/languages/cpp';
import ruby from 'highlight.js/lib/languages/ruby';
import php from 'highlight.js/lib/languages/php';
import swift from 'highlight.js/lib/languages/swift';
import scala from 'highlight.js/lib/languages/scala';
import sql from 'highlight.js/lib/languages/sql';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import markdown from 'highlight.js/lib/languages/markdown';
import bash from 'highlight.js/lib/languages/bash';
import properties from 'highlight.js/lib/languages/properties';
import dockerfile from 'highlight.js/lib/languages/dockerfile';

const LANGUAGES = {
  java, python, javascript, typescript, go, rust, csharp, kotlin, cpp, ruby, php,
  swift, scala, sql, json, yaml, xml, css, markdown, bash, properties, dockerfile,
};
Object.entries(LANGUAGES).forEach(([name, def]) => hljs.registerLanguage(name, def));

const BY_EXTENSION = {
  java: 'java', py: 'python', js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript', go: 'go', rs: 'rust', cs: 'csharp', kt: 'kotlin', kts: 'kotlin',
  c: 'cpp', h: 'cpp', cpp: 'cpp', hpp: 'cpp', cc: 'cpp', rb: 'ruby', php: 'php', swift: 'swift',
  scala: 'scala', sql: 'sql', json: 'json', yaml: 'yaml', yml: 'yaml', xml: 'xml', html: 'xml',
  htm: 'xml', svg: 'xml', css: 'css', scss: 'css', md: 'markdown', sh: 'bash', bash: 'bash',
  properties: 'properties', env: 'properties', toml: 'properties', ini: 'properties',
};

const FILE_COLOR = {
  java: 'java', kt: 'java', kts: 'java', scala: 'java', rs: 'java',
  py: 'py', go: 'ts', cs: 'docs', rb: 'web', php: 'style', swift: 'java', c: 'py', h: 'py', cpp: 'py',
  js: 'js', jsx: 'js', mjs: 'js', cjs: 'js',
  ts: 'ts', tsx: 'ts',
  html: 'web', htm: 'web', xml: 'web', svg: 'web',
  css: 'style', scss: 'style',
  json: 'data', sql: 'data', csv: 'data',
  md: 'docs', txt: 'docs',
  yml: 'config', yaml: 'config', properties: 'config', toml: 'config', ini: 'config', env: 'config',
  sh: 'config', gitignore: 'config', dockerignore: 'config', lock: 'config',
};

const MAX_HIGHLIGHT_CHARS = 300_000;

function extensionOf(path) {
  const name = path.split('/').pop().toLowerCase();
  if (name === 'dockerfile') return 'dockerfile';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1) : '';
}

export function languageForPath(path) {
  const ext = extensionOf(path);
  if (ext === 'dockerfile') return 'dockerfile';
  return BY_EXTENSION[ext] ?? null;
}

export function fileColor(path) {
  const ext = extensionOf(path);
  if (ext === 'dockerfile') return 'var(--dl-file-config)';
  return `var(--dl-file-${FILE_COLOR[ext] ?? 'other'})`;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlightCode(code, language) {
  const lang = language && hljs.getLanguage(language) ? language : null;
  if (!lang || code.length > MAX_HIGHLIGHT_CHARS) return escapeHtml(code);
  try {
    return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(code);
  }
}

export function highlightLines(code, language) {
  const html = highlightCode(code, language);
  const open = [];
  return html.split('\n').map((line) => {
    const prefix = open.join('');
    const tags = line.match(/<span[^>]*>|<\/span>/g) || [];
    for (const tag of tags) {
      if (tag === '</span>') open.pop();
      else open.push(tag);
    }
    return prefix + line + '</span>'.repeat(open.length);
  });
}
