# 自动化资产生成执行器
$ErrorActionPreference = "Stop"

$baseDir = "D:\test\kaipao"
$runeDir = "$baseDir\assets\runes"
$iconDir = "$baseDir\assets\icons"

if (!(Test-Path $iconDir)) { New-Item -ItemType Directory -Path $iconDir -Force | Out-Null }
if (!(Test-Path $runeDir)) { New-Item -ItemType Directory -Path $runeDir -Force | Out-Null }

Write-Host ">>> Compiling AssetGenerator.cs..." -ForegroundColor Cyan
Add-Type -Path "$baseDir\scripts\AssetGenerator.cs" -ReferencedAssemblies System.Drawing

Write-Host ">>> Generating 14 High-Definition Runes..." -ForegroundColor Cyan
[StudioAssetGenerator]::GenerateRuneAttack("$runeDir\rune_attack.png")
[StudioAssetGenerator]::GenerateRuneFirerate("$runeDir\rune_firerate.png")
[StudioAssetGenerator]::GenerateRuneCrit("$runeDir\rune_crit.png")
[StudioAssetGenerator]::GenerateRuneCritDmg("$runeDir\rune_critDmg.png")
[StudioAssetGenerator]::GenerateRuneRange("$runeDir\rune_range.png")
[StudioAssetGenerator]::GenerateRunePierce("$runeDir\rune_pierce.png")
[StudioAssetGenerator]::GenerateRuneMultishot("$runeDir\rune_multishot.png")
[StudioAssetGenerator]::GenerateRuneHp("$runeDir\rune_hp.png")
[StudioAssetGenerator]::GenerateRuneShield("$runeDir\rune_shield.png")
[StudioAssetGenerator]::GenerateRuneSkillPower("$runeDir\rune_skillPower.png")
[StudioAssetGenerator]::GenerateRuneSkillCd("$runeDir\rune_skillCd.png")
[StudioAssetGenerator]::GenerateRuneSkillRange("$runeDir\rune_skillRange.png")
[StudioAssetGenerator]::GenerateRuneMagnet("$runeDir\rune_magnet.png")
[StudioAssetGenerator]::GenerateRuneExp("$runeDir\rune_exp.png")

Write-Host ">>> Generating UI Icons..." -ForegroundColor Yellow
[StudioAssetGenerator]::GenerateIconCoin("$iconDir\icon_coin.png")
[StudioAssetGenerator]::GenerateIconStamina("$iconDir\icon_stamina.png")
[StudioAssetGenerator]::GenerateIconGem("$iconDir\icon_gem.png")
[StudioAssetGenerator]::GenerateIconPart("$iconDir\icon_part.png")
[StudioAssetGenerator]::GenerateIconChip("$iconDir\icon_chip.png")
[StudioAssetGenerator]::GenerateIconShard("$iconDir\icon_shard.png")
[StudioAssetGenerator]::GenerateIconRank("$iconDir\icon_rank.png")
[StudioAssetGenerator]::GenerateIconHp("$iconDir\icon_hp.png")
[StudioAssetGenerator]::GenerateIconShield("$iconDir\icon_shield.png")
[StudioAssetGenerator]::GenerateIconLevel("$iconDir\icon_level.png")
[StudioAssetGenerator]::GenerateIconSkull("$iconDir\icon_kills.png", $false)
[StudioAssetGenerator]::GenerateIconSkull("$iconDir\icon_boss.png", $true)
[StudioAssetGenerator]::GenerateIconReroll("$iconDir\icon_reroll.png")
[StudioAssetGenerator]::GenerateIconSettings("$iconDir\icon_settings.png")

Write-Host ">>> All Assets Generated Successfully!" -ForegroundColor Green
