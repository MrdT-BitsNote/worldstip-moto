# 摩托行 · moto.worldstip.com

31 省 / 360 地市 / 1713 条摩托车骑行路线的静态站点与开放数据接口。
**本仓库根目录即站点根目录**：解压/检出后直接指向 `index.html` 所在层即可托管，无需构建。

> Astro 源码已于 2026-10-24 丢失，本仓库以「构建产物 + 数据管线脚本」的形态维护。
> 站点页面不要手改；数据与接口配置都在本文档覆盖的范围内。

---

## 目录结构

| 路径 | 内容 |
|---|---|
| `index.html` | 首页 |
| `{省}/`、`{省}/routes/{id}/` | 省份页、路线详情页（湖南例外：走 `/routes/{id}/`） |
| `map.html` | 路线地图（单线聚焦、图层开关） |
| `api-docs/` | 开放数据接口文档（`api-docs.html` 为跳转存根） |
| `map-data/index.json` | 全国索引（31 省 + 总量） |
| `map-data/provinces/{code}.json` | 省份数据包，含轨迹折线 |
| `map-data/routes-index.json` | **紧凑路线索引**（414 KB，不含轨迹） |
| `gpx/{id}.gpx` | 单条路线 GPX |
| `province-illustrations/` | 省份水彩封面 1200×686 |
| `tools/build-routes-index.mjs` | 从省份包重建 `routes-index.json` |
| `tools/patch-api-docs.mjs` | 给 `api-docs/index.html` 打跨域/端点补丁（幂等） |
| `deploy/nginx/moto.worldstip.com.conf` | **CORS 配置**，上线必读 |

---

## 开放数据接口

```bash
# ① 索引：31 省 + 文件路径 + 总量
curl https://moto.worldstip.com/map-data/index.json

# ② 省份包：该省全部路线（含 p[] 抽稀轨迹与 w[] 途经点）
curl https://moto.worldstip.com/map-data/provinces/hunan.json

# ③ 紧凑索引：1713 条路线的元数据，不含轨迹（搜路线用这个）
curl https://moto.worldstip.com/map-data/routes-index.json

# ④ GPX
curl -O https://moto.worldstip.com/gpx/taifushan.gpx
```

- 坐标系一律 **GCJ-02**（高德体系），配高德底图零偏移；配 OSM/Google 需自行转 WGS-84。
- `w[0]` 恒为集合点；`wn[]` 是**景点名**，不是城市名。
- `cs` 文案状态：`verified` / `reviewed` / `computed`（全部长途环线）。
- 市区周边实测线 1658 条 + 跨界长途环线 55 条；长途环线 `citySlug` 恒为 `loops`。

---

## 跨域（CORS）：部署时必须做

**现象**（2026-11-06 实测）：`GET` 响应不带 `Access-Control-Allow-Origin`，`OPTIONS` 返回 405。
服务端脚本（Python / Node / curl）不受影响，但任何网页里的 `fetch()` 都会被浏览器拦。

nginx 把 `deploy/nginx/moto.worldstip.com.conf` 里的 `location` 段合并进现有 `server { }`：

```nginx
location ~* \.(json|gpx|md)$ {
    add_header Access-Control-Allow-Origin   "*" always;
    add_header Access-Control-Allow-Methods  "GET, HEAD, OPTIONS" always;
    add_header Access-Control-Allow-Headers  "Range, If-None-Match, Content-Type" always;
    add_header Access-Control-Expose-Headers "Content-Length, Content-Range, ETag" always;
    add_header Access-Control-Max-Age        86400 always;
    add_header Cache-Control "public, max-age=86400" always;
    if ($request_method = OPTIONS) { return 204; }
}
```

```bash
nginx -t && nginx -s reload
curl -sS -D - -o /dev/null -H "Origin: https://example.com" \
     https://moto.worldstip.com/map-data/index.json | grep -i access-control
# 期望：access-control-allow-origin: *
```

非 nginx 环境：`_headers`（Cloudflare Pages / Netlify）、`.htaccess`（Apache）已随包提供，二选一即可。

---

## 重建路线索引

```bash
node tools/build-routes-index.mjs .
# 读 map-data/provinces/*.json → 写 map-data/routes-index.json（1713 路线 / 360 城 / 414 KB）
```

只读源数据、不改任何既有字段；轨迹 `p[]` 不复制。
