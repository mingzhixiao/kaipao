$ErrorActionPreference = "Stop"

$baseDir = "D:\test\kaipao"
$brainDir = "C:\Users\15199\.gemini\antigravity-ide\brain\61aabf1f-3c5d-4828-8c0a-1795a400b896"
$dstDir = "$baseDir\assets\icons"

if (-not (Test-Path $dstDir)) {
    New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
}

Write-Host ">>> Compiling IconKeyer and HighEndIconRenderer..." -ForegroundColor Cyan
. "$baseDir\scripts\IconKeyer.ps1"
Add-Type -Path "$baseDir\scripts\HighEndIconRenderer.cs" -ReferencedAssemblies System.Drawing

Write-Host ">>> Processing 14 Ultra HD UI Icons..." -ForegroundColor Yellow

# 1. 货币 - 科幻钛金硬币 (icon_coin.png)
[IconKeyer]::ProcessIcon("$brainDir\icon_coin_raw_1788879113993.jpg", "$dstDir\icon_coin.png", 12, 24)

# 2. 晶核 - 八面体折射动力棱镜晶石 (icon_gem.png)
[IconKeyer]::ProcessIcon("$brainDir\icon_gem_raw_1788879126092.jpg", "$dstDir\icon_gem.png", 12, 24)

# 3. 生命 - 红宝石机能生命核心心形 (icon_hp.png)
[IconKeyer]::ProcessIcon("$brainDir\icon_hp_raw_1788879137433.jpg", "$dstDir\icon_hp.png", 12, 24)

# 4. 护盾 - 六边形能量神盾力场 (icon_shield.png)
[IconKeyer]::ProcessIcon("$brainDir\icon_shield_raw_1788879153151.jpg", "$dstDir\icon_shield.png", 12, 24)

# 5. 体力/战力 - 金色雷霆电弧狂暴能量 (icon_stamina.png)
[IconKeyer]::ProcessIcon("$brainDir\icon_stamina_raw_1788879174904.jpg", "$dstDir\icon_stamina.png", 12, 24)

# 6. 物资/芯片 - 量子黑晶金引脚CPU (icon_chip.png)
[IconKeyer]::ProcessIcon("$brainDir\icon_chip_raw_1788879185291.jpg", "$dstDir\icon_chip.png", 12, 24)

# 7. 机械零件 - 钛金重型内六角螺栓与齿轮组件 (icon_part.png)
[IconKeyer]::ProcessIcon("$brainDir\icon_part_raw_1788879196822.jpg", "$dstDir\icon_part.png", 12, 24)

# 8. 基因碎片 - 离子球内悬浮双螺旋DNA (icon_shard.png)
[IconKeyer]::ProcessIcon("$brainDir\icon_shard_raw_1788879209070.jpg", "$dstDir\icon_shard.png", 12, 24)

# 9. 关卡/对战 - 双持等离子光刃交叉战刃 (icon_level.png)
[IconKeyer]::ProcessIcon("$brainDir\icon_level_raw_1788879230583.jpg", "$dstDir\icon_level.png", 12, 24)

# 10. 击杀 - 赛博陨铁合金暗黑骷髅 (icon_kills.png)
[IconKeyer]::ProcessIcon("$brainDir\icon_kills_pure_1788879292755.jpg", "$dstDir\icon_kills.png", 12, 24)

# 11. Boss预警 - 熔岩犄角地狱领主颅骨 (icon_boss.png)
[IconKeyer]::ProcessIcon("$brainDir\icon_boss_raw_1788879264216.jpg", "$dstDir\icon_boss.png", 12, 24)

# 12. 军衔/勋章 - 纯金五星桂冠战地指挥官勋章 (icon_rank.png)
[IconKeyer]::ProcessIcon("$brainDir\icon_rank_raw_1788879273919.jpg", "$dstDir\icon_rank.png", 12, 24)

# 13. 战术重抽 - 赛博高阶量子骰子 (icon_reroll.png)
[HighEndIconRenderer]::RenderQuantumDice("$dstDir\icon_reroll.png")

# 14. 系统设置 - 航天级钛金精密齿轮反应堆 (icon_settings.png)
[HighEndIconRenderer]::RenderPrecisionTitaniumGear("$dstDir\icon_settings.png")

Write-Host ">>> ALL 14 ICONS SUCCESSFULLY GENERATED AND KEYED!" -ForegroundColor Green
