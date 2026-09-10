// 部署前把「运行时真正需要」的文件同步到 dist/，再上传 dist/。
//
// 之前是 `wrangler pages deploy .`：仓库里还放着 scripts/ 下的一次性美术生成脚本、
// tmp/ 草稿、README 与 package.json，全都会被推到 CDN 上——既拖慢上传，
// 也把运行时用不到的东西暴露出去。
//
// 用法：npm run deploy          正常打包并上传
//       npm run deploy -- --dry-run   只生成 dist/ 并校验，不上传
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'dist');

// 运行时会加载的全部内容：入口页、缓存头、ES 模块、热更新 JSON 配置、美术资源。
// functions/ 是 Cloudflare Pages Functions（D1 云存档的 /api/save 端点）——Pages 只从
// 被部署目录根部的 functions/ 里识别函数，漏掉它线上就会 404。
const INCLUDE = ['index.html', '_headers', 'src', 'assets', 'config', 'functions'];

// 扫描引用的源码范围（与 INCLUDE 保持一致）
const SCAN_DIRS = ['src', 'config'];
const SCAN_FILES = ['index.html'];

function copyStaged() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const entry of INCLUDE) {
    const from = path.join(root, entry);
    if (!fs.existsSync(from)) {
      console.warn(`[deploy] 跳过缺失项: ${entry}`);
      continue;
    }
    fs.cpSync(from, path.join(outDir, entry), { recursive: true });
  }
}

function collectSources() {
  const out = SCAN_FILES.map(f => path.join(root, f)).filter(f => fs.existsSync(f));
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|mjs|html|json)$/.test(e.name)) out.push(p);
    }
  };
  for (const d of SCAN_DIRS) {
    const abs = path.join(root, d);
    if (fs.existsSync(abs)) walk(abs);
  }
  return out;
}

// 上线前兜底：源码里出现的每个 assets/... 路径都必须真的被打进了 dist/
function verifyAssetRefs() {
  const refs = new Set();
  for (const file of collectSources()) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/assets\/[A-Za-z0-9_\-./]+\.(?:png|jpg|jpeg|webp|svg|mp3|wav)/g)) {
      refs.add(m[0]);
    }
  }
  const missing = [...refs].filter(rel => !fs.existsSync(path.join(outDir, rel))).sort();
  if (missing.length) {
    console.error(`[deploy] 中止：有 ${missing.length} 个被引用的资源不在 dist/ 中`);
    for (const m of missing) console.error('  -', m);
    return false;
  }
  console.log(`[deploy] 资源引用校验通过（${refs.size} 个路径）`);
  return true;
}

function dirSize(dir) {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return total;
}

copyStaged();
if (!verifyAssetRefs()) process.exit(1);

console.log(`[deploy] dist/ 就绪，共 ${(dirSize(outDir) / 1024 / 1024).toFixed(1)} MB`);

if (process.argv.includes('--dry-run')) {
  console.log('[deploy] --dry-run：跳过上传');
  process.exit(0);
}

const args = [
  'wrangler', 'pages', 'deploy', 'dist',
  '--project-name=kaipao-game',
  '--branch=main',
  '--commit-dirty=true'
];
const res = spawnSync('npx', args, { stdio: 'inherit', cwd: root, shell: process.platform === 'win32' });
process.exit(res.status ?? 1);
