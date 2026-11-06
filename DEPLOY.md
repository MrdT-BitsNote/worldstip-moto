# 摩托行 · moto.worldstip.com — 上传与部署

> 31 省区 / 360 地市 / 1713 条骑行路线（1658 条市区周边实测 + 55 条跨市长途环线）/ 5022 个途经点
> 纯静态，**解压即传、无需构建**。本包根目录就是站点根目录。

## 一、包内容

| 路径 | 内容 |
|---|---|
| `index.html` | 首页 |
| `{省}/`、`{省}/routes/{id}/` | 省份页、路线详情页（湖南例外：`/routes/{id}/`） |
| `map.html` | 路线地图（单线聚焦、图层开关、途经点标注） |
| `api-docs/` | 开放数据接口文档（`api-docs.html` 是跳转存根） |
| `map-data/index.json` | 全国索引：31 省 + 总量 + `routesIndex` 指针 |
| `map-data/provinces/{code}.json` | 省份数据包（含抽稀轨迹 `p[]` 与途经点 `w[]`） |
| **`map-data/routes-index.json`** | **紧凑路线索引 414 KB**：1713 条路线的元数据，**不含轨迹** |
| `gpx/{id}.gpx` | 单条路线 GPX |
| `province-illustrations/` | 省份水彩封面 1200×686 |
| `_headers` / `.htaccess` | Cloudflare Pages / Apache 的跨域兜底（nginx 上不生效） |

> 找路线先用 `routes-index.json`（414 KB），命中后再回省份包取轨迹，不必一上来就下 13.5 MB。

## 二、上传

解压到站点根目录（`index.html` 必须在根这一层）：

```bash
unzip moto.worldstip.com-20261106.zip -d /www/wwwroot/moto.worldstip.com
chown -R www:www /www/wwwroot/moto.worldstip.com
```

验证：
```bash
curl -s -o /dev/null -w '%{http_code}\n' https://moto.worldstip.com/map-data/routes-index.json  # 期望 200
curl -s https://moto.worldstip.com/map-data/index.json | head -c 200                             # 期望 JSON
curl -s -o /dev/null -w '%{http_code}\n' https://moto.worldstip.com/api-docs/                    # 期望 200
```

## 三、跨域（CORS）—— 浏览器调用必须做

线上实测（2026-11-06）：`.json` / `.gpx` 的 `GET` 不带 `Access-Control-Allow-Origin`，
`OPTIONS` 返回 **405**。服务端脚本不受影响，网页 `fetch()` 会被浏览器拦。
（`api-docs` 页此前写的「无跨域限制」是错的，本次已改。）

在 nginx 站点配置的 `server { }` 内加入：

```nginx
location ~* \.(json|gpx|md)$ {
    add_header Access-Control-Allow-Origin      "*" always;
    add_header Access-Control-Allow-Methods     "GET, HEAD, OPTIONS" always;
    add_header Access-Control-Allow-Headers     "Range, If-None-Match, Content-Type" always;
    add_header Access-Control-Expose-Headers    "Content-Length, Content-Range, ETag" always;
    add_header Access-Control-Max-Age           86400 always;
    add_header Cache-Control                    "public, max-age=86400" always;
    if ($request_method = OPTIONS) { return 204; }
}
```

```bash
nginx -t && nginx -s reload
curl -sS -D - -o /dev/null -H "Origin: https://example.com" \
     https://moto.worldstip.com/map-data/index.json | grep -i access-control
# 期望：access-control-allow-origin: *
```

完整 server 块示例见 `deploy/nginx/moto.worldstip.com.conf`。

## 四、注意

- 本站**没有 `404.html`**（构建产物未生成），不要在 nginx 里配 `error_page 404 /404.html`。
- 站内是目录式 URL，`try_files` 需带 `$uri/` 与 `$uri.html`。
- 坐标系一律 GCJ-02；`w[0]` 恒为集合点，`wn[]` 是景点名不是城市名。
