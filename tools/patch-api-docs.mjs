#!/usr/bin/env node
/**
 * patch-api-docs.mjs — 给已构建的 api-docs/index.html 打补丁（幂等）。
 *
 * 背景：moto 站的 Astro 源码已丢失，api-docs 页只能作为静态产物维护。
 * 本脚本做两件事，且都带断言——跑第二遍会提示已是目标状态而不是重复插入：
 *   ① 把「无跨域限制」的错误表述改成实测事实（浏览器端需服务端下发 CORS）
 *   ② 补两个此前漏文档的端点：/map-data/routes-index.json、/gpx/{id}.gpx
 *
 * 用法：node tools/patch-api-docs.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'api-docs', 'index.html');
const CID = 'data-astro-cid-azxzs7nu';

if (!existsSync(FILE)) {
  console.error(`[patch] 找不到 ${FILE}`);
  process.exit(1);
}
let html = readFileSync(FILE, 'utf8');
const before = html.length;

// ① 跨域表述
const oldCors = `纯静态文件，可被任意 CDN 缓存。无鉴权、无频控、无跨域限制。`;
const newCors =
  `纯静态文件，可被任意 CDN 缓存。无鉴权、无频控。` +
  `<b ${CID}>服务端（Python / Node / Go / curl）可直接调用</b>；` +
  `浏览器端 <code ${CID}>fetch()</code> 受同源策略约束，需要服务端在 <code ${CID}>.json</code> / <code ${CID}>.gpx</code> ` +
  `响应上带 <code ${CID}>Access-Control-Allow-Origin</code> —— 部署包内 ` +
  `<code ${CID}>deploy/nginx/moto.worldstip.com.conf</code> 已给出可直接合并的配置。`;

if (html.includes(oldCors)) {
  html = html.replace(oldCors, newCors);
  console.log('[patch] 已修正跨域表述');
} else if (html.includes('服务端（Python / Node / Go / curl）可直接调用')) {
  console.log('[patch] 跨域表述已是目标状态，跳过');
} else {
  console.error('[patch] 未找到跨域表述锚点，中止');
  process.exit(1);
}

// ② 补端点卡片
const anchor = `</section> <section id="schema"`;
const cards = `
<div class="card ad-endpoint" ${CID}> <span class="ad-method" ${CID}>GET</span><span class="ad-path" ${CID}>/map-data/routes-index.json</span> <p ${CID}><b ${CID}>紧凑索引（414 KB）</b>。1713 条路线的 <code ${CID}>id / n / t / d / days / city / citySlug / url / cs</code> 与集合点坐标 <code ${CID}>w0</code>，<b ${CID}>不含轨迹折线</b>。做「按城市找路线」「按名称搜路线」时先取它，不必下载 13.5 MB 全量；命中后再回省份包取完整记录（含 <code ${CID}>p[]</code>）。附 <code ${CID}>cities[]</code> 城市聚合（360 城）。</p> </div>
<div class="card ad-endpoint" ${CID}> <span class="ad-method" ${CID}>GET</span><span class="ad-path" ${CID}>/gpx/{id}.gpx</span> <p ${CID}>单条路线的 GPX 轨迹文件（<code ${CID}>application/octet-stream</code>），<code ${CID}>id</code> 同 <code ${CID}>routes[].id</code>。实测 <code ${CID}>/gpx/taifushan.gpx</code> 为 47 KB。仅市区周边实测线提供，跨市长途环线（<code ${CID}>cs=computed</code>）无 GPX。</p> </div>`;

if (html.includes('/map-data/routes-index.json')) {
  console.log('[patch] 端点卡片已存在，跳过');
} else if (html.includes(anchor)) {
  html = html.replace(anchor, `${cards} ${anchor}`);
  console.log('[patch] 已补 routes-index.json 与 gpx 两个端点');
} else {
  console.error('[patch] 未找到 schema 锚点，中止');
  process.exit(1);
}

writeFileSync(FILE, html, 'utf8');
console.log(`[patch] ${before} → ${html.length} bytes`);
