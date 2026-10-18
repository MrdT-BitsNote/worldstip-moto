# worldstip-moto — WorldsTip 摩旅子站（moto.worldstip.com）

Astro 构建产物（`dist/`）的完整镜像备份。**这是站点真实部署内容**，非源码仓库。

## 目录结构
| 路径 | 内容 |
|---|---|
| `index.html` | 首页（省份索引） |
| `/<province>/index.html` | 18 个省级板块：anhui chongqing fujian gansu guangdong guangxi guizhou hainan henan hubei hunan jiangsu jiangxi shaanxi shandong sichuan yunnan zhejiang |
| `/<province>/city/<city>/` | 各市路线索引 |
| `/<province>/routes/<route>/` | 路线详情页（含高德 WebService 生成的 `drivingPolyline`） |
| `routes/<route>/` | 根级路线（跨省/无省归属） |
| `gpx/` | 199 条根级路线的 GPX 轨迹 |
| `province-illustrations/` | 18 张省份水墨插画（含补齐的 gansu.png / hainan.png） |
| `_astro/` | 构建产物（哈希 CSS/JS） |

## 2026-10-18 数据校准（本次备份包含）
对全站 **1339 条路线**做了真实性审计与校准：

1. **误标修正**：325 条标注「攻山压弯」中，79 条经轨迹几何反算（累计转向 °/km）判定为误标——
   - 26 条近乎直线（<50°/km）→ 重分级并重写描述
   - 53 条弯道偏少（50–90°/km）→ 降级并修正「弯密坡陡」等夸大措辞
   - 结果：`攻山压弯` 639→560，`山林湖泊` 855→928，`近郊休闲` 102→430
2. **爬升数据**：原有整数「爬升（估）」无实测依据，全站 1339 页改为「爬升（未实测）」。
3. **汉化修复**：322 处英文 `leisure` 徽章 → `近郊休闲`。
4. **未改动项（如实保留）**：
   - 道路几何、坐标、里程为高德实算，真实可信（里程÷轨迹长 中位数 1.00）
   - 19 组路线轨迹重复（实为同地点不同名的重复条目）、少数终点偏差，需 WebService Key 才能重算，暂未处理。

## 部署说明
本目录使用**根绝对路径**（`/_astro/...`、`/province-illustrations/...`），与线上部署一致。
如需托管到 GitHub Pages 的子路径（`/<repo>/`），必须先把根绝对链接改写为相对路径，否则资源会 404。

## 来源
- 站点：https://moto.worldstip.com
- 构建时间：2026-10-18
