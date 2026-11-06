#!/usr/bin/env node
/**
 * build-routes-index.mjs — 从 map-data/provinces/*.json 生成紧凑路线索引。
 *
 * 为什么需要它：全量 map-data 是 13.5MB（含轨迹折线），而「按城市找路线 / 按名称搜路线」
 * 只需要 id、名称、里程、类型、城市与详情页地址。之前要做到这件事，调用方必须先把
 * 31 个省包（含轨迹）全部下载再自己剥字段。本文件把这件事前置成一次 250KB 的请求。
 *
 * 输出：map-data/routes-index.json
 *   { generated, totalRoutes, totalCities, source, notice,
 *     routes: [{ id, n, t, d, days, c, city, citySlug, url, cs, w0 }],
 *     cities: [{ city, citySlug, province, routes }] }
 *
 * 纪律：只读 provinces/*.json，不改任何一个已有字段的值；轨迹 p[] 不复制（体积大头）。
 *
 * 用法：node tools/build-routes-index.mjs [站点根目录]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[2] || join(__dirname, '..');
const MAP = join(ROOT, 'map-data');
const PROV = join(MAP, 'provinces');

if (!existsSync(PROV)) {
  console.error(`[routes-index] 找不到 ${PROV}`);
  process.exit(1);
}

const files = readdirSync(PROV).filter((f) => f.endsWith('.json')).sort();
const routes = [];
const cityMap = new Map();

// 数据日期以全国索引为准（省份包里没有 generated 字段）
let generated = 'unknown';
const idxPath = join(MAP, 'index.json');
if (existsSync(idxPath)) {
  try {
    generated = JSON.parse(readFileSync(idxPath, 'utf8')).generated || generated;
  } catch { /* 索引损坏时退化为 unknown，不阻断 */ }
}

for (const f of files) {
  const d = JSON.parse(readFileSync(join(PROV, f), 'utf8'));
  if (!generated && d.generated) generated = d.generated;
  const provName = d.province || f.replace(/\.json$/, '');

  for (const c of d.cities || []) {
    const key = `${provName}/${c.slug}`;
    if (!cityMap.has(key)) {
      cityMap.set(key, {
        city: c.name, citySlug: c.slug, province: provName, routes: 0,
      });
    }
  }

  for (const r of d.routes || []) {
    const rec = {
      id: r.id,
      n: r.n,
      t: r.t,
      d: r.d,
      days: r.days,
      city: r.city,
      citySlug: r.citySlug,
      url: r.url,
      cs: r.cs,
    };
    if (r.c) rec.c = r.c;                 // 省份主题色，前端可直接用
    if (Array.isArray(r.w) && r.w.length) rec.w0 = r.w[0]; // 集合点坐标
    routes.push(rec);

    const key = `${provName}/${r.citySlug}`;
    const c = cityMap.get(key);
    if (c) c.routes += 1;
  }
}

// 只保留真的有路线的城市条目，按省 + 路线数排序
const cities = [...cityMap.values()]
  .filter((c) => c.routes > 0)
  .sort((a, b) => a.province.localeCompare(b.province, 'zh') || b.routes - a.routes);
routes.sort((a, b) => String(a.id).localeCompare(String(b.id)));

const out = {
  generated: generated || 'unknown',
  totalRoutes: routes.length,
  totalCities: cities.length,
  source: 'map-data/provinces/*.json',
  notice: '紧凑索引：不含轨迹折线 p[]。需要轨迹请按 city/url 回省份包取完整记录。',
  routes,
  cities,
};

const target = join(MAP, 'routes-index.json');
writeFileSync(target, JSON.stringify(out, null, 0), 'utf8');
const kb = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0);
console.log(`[routes-index] ${routes.length} 路线 / ${cities.length} 城 → ${target} (${kb} KB)`);
