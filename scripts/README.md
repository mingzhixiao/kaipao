# scripts/

## 当前在用的

| 脚本 | 用途 |
| :--- | :--- |
| `qa.mjs` | **唯一的自动化校验关卡**（`npm run qa`）。解析全部 ES 模块、校验玩法 JSON 配置与结算规则，并断言若干数值不变量。任何改动都应先过它。 |
| `deploy.mjs` | 把运行时需要的文件（`index.html` / `_headers` / `src` / `assets` / `config`）同步到 `dist/`，校验资源引用后上传 Cloudflare Pages。`npm run deploy -- --dry-run` 只打包校验、不上传。 |
| `test_gamedev_optimization.mjs` | 针对 `SoundEngine` / `FeedbackManager` / `StageUI` 的补充检查，可单独运行。 |

## 历史美术工具（一次性，已执行完毕）

以下 PowerShell / C# 脚本用于生成或后处理 `assets/` 下的美术资源。它们都依赖
**写死的绝对路径**（如 `D:\test\kaipao\assets\...`，部分还指向已不存在的
`C:\Users\...\.gemini\...\brain\` 原图目录），因此**在本机之外不可复现**，
保留仅作为产出来源的记录：

- `AssetGenerator.cs` + `run_asset_gen.ps1` — 程序化生成符文图标与全部 UI 图标
  （`StudioAssetGenerator` 类的唯一来源）。
- `AssetDeployer.cs` — 深空科幻资产落地：背景、要塞墙、磁浮扫荡舰、战术无人机的
  缩放置换（Task 1 资产瘦身即由它完成）。
- `HighEndIconRenderer.cs` / `HighEndIconRenderer.ps1` — 量子骰子与钛合金齿轮图标。
  `BatchProcessAllIcons.ps1` 编译的是 `.cs`，**`.ps1` 已无引用**，可择机删除。
- `IconKeyer.ps1` + `BatchProcessAllIcons.ps1` / `run_keyer.ps1` / `test_pixel.ps1` /
  `verify_icons.ps1` — 抠图去背流水线。
- `generate_rune_icons.ps1` / `generate_bullet_sprites.ps1` — 符文与子弹贴图。
- `convert_sprites.ps1` / `flood_fill_sprites.ps1` / `precision_keyer.ps1` /
  `process_boss.ps1` / `process_clean_sprites.ps1` / `process_hd_skills.ps1` /
  `generate_card_icons.ps1` — 早期各类角色的去背与清洗。
- `resize_assets.ps1` — 资产降采样（只缩不放）。用 `$PSScriptRoot` 定位仓库根，
  可重复执行；原图随时能用 `git checkout -- assets/` 还原。

> 新增资产处理脚本时，请用 `$PSScriptRoot` 推导路径，不要再写死盘符。
