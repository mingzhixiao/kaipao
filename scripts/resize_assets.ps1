# 一次性资产降采样：把远超实际渲染尺寸的 PNG 缩到合理上限，保留 alpha。
# 仅缩小、不放大；max 尺寸按 2x DPR 下的实际显示尺寸 + 余量推算。
# 原图可随时用 `git checkout -- assets/` 还原。

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Resize-Png {
    param([string]$Path, [int]$MaxW, [int]$MaxH)

    if (-not (Test-Path $Path)) { return "MISS  $Path" }

    $before = (Get-Item $Path).Length
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $ms = New-Object System.IO.MemoryStream(, $bytes)
    $img = [System.Drawing.Image]::FromStream($ms)
    $ow = $img.Width
    $oh = $img.Height

    if ($ow -le $MaxW -and $oh -le $MaxH) {
        $img.Dispose(); $ms.Dispose()
        return "SKIP  $Path ($ow x $oh already <= $MaxW x $MaxH)"
    }

    $ratio = [Math]::Min($MaxW / $ow, $MaxH / $oh)
    $nw = [Math]::Max(1, [int][Math]::Round($ow * $ratio))
    $nh = [Math]::Max(1, [int][Math]::Round($oh * $ratio))

    $bmp = New-Object System.Drawing.Bitmap $nw, $nh, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $nw, $nh))
    $g.Dispose()
    $img.Dispose(); $ms.Dispose()

    # 先写临时文件再替换，避免与源文件句柄冲突
    $tmp = "$Path.tmp.png"
    $bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Move-Item -Force $tmp $Path

    $after = (Get-Item $Path).Length
    $pct = [int](100 - ($after / $before) * 100)
    return ("OK    {0}  {1}x{2} -> {3}x{4}  {5}KB -> {6}KB (-{7}%)" -f `
        $Path, $ow, $oh, $nw, $nh, [int]($before / 1KB), [int]($after / 1KB), $pct)
}

# ---- 目标尺寸表：通配符 -> (MaxW, MaxH) ----
$targets = @(
    @{ Glob = 'assets/characters/runner*.png';       W = 256; H = 256 },
    @{ Glob = 'assets/characters/charger*.png';      W = 256; H = 256 },
    @{ Glob = 'assets/characters/behemoth*.png';     W = 256; H = 256 },
    @{ Glob = 'assets/characters/hero.png';          W = 256; H = 256 },
    @{ Glob = 'assets/characters/boss_overlord*.png'; W = 320; H = 320 },
    @{ Glob = 'assets/vehicles/truck.png';           W = 256; H = 256 },
    # tornado 场上最大约 361x390 CSS -> 2x DPR 需 ~722x780，保留 768 避免发虚
    @{ Glob = 'assets/skills/tornado.png';           W = 768; H = 768 },
    # bomber 炸弹绘制 64x64 CSS -> 2x DPR 需 128
    @{ Glob = 'assets/skills/bomber.png';            W = 256; H = 256 },
    # boomerang 绘制 40x40 CSS -> 2x DPR 需 80
    @{ Glob = 'assets/skills/boomerang.png';         W = 128; H = 128 },
    # laser 只作大厅技能图鉴图标 (54x54 CSS)，不作运行时特效贴图
    @{ Glob = 'assets/skills/laser.png';             W = 192; H = 192 },
    # breath 绘制 range(350) x 56 CSS -> 2x DPR 需 700x112
    @{ Glob = 'assets/skills/breath.png';            W = 768; H = 428 },
    # pet-bullet 绘制 8x8 CSS -> 2x DPR 需 16
    @{ Glob = 'assets/skills/pet-bullet.png';        W = 64;  H = 64  },
    # 宠物最大显示为大厅头像 72x72 CSS -> 2x DPR 需 144
    @{ Glob = 'assets/pets/*.png';                   W = 192; H = 192 },
    @{ Glob = 'assets/cards/icon_crit.png';          W = 160; H = 160 },
    @{ Glob = 'assets/cards/icon_firerate.png';      W = 160; H = 160 },
    @{ Glob = 'assets/icons/*.png';                  W = 128; H = 128 },
    @{ Glob = 'assets/runes/*.png';                  W = 128; H = 128 },
    @{ Glob = 'assets/environment/fortress_wall.png'; W = 900; H = 432 }
    # bg_highway.png 保持原尺寸：整屏背景，当前 768x1376 已接近 2x DPR 所需
)

$sumBefore = 0
$sumAfter = 0
foreach ($t in $targets) {
    $files = Get-ChildItem -Path $t.Glob -File -ErrorAction SilentlyContinue
    if (-not $files) { Write-Output "MISS  (no match) $($t.Glob)"; continue }
    foreach ($f in $files) {
        $rel = $f.FullName.Substring($root.Length + 1).Replace('\', '/')
        $b = $f.Length
        $line = Resize-Png -Path $rel -MaxW $t.W -MaxH $t.H
        Write-Output $line
        if ($line -like 'OK*') {
            $sumBefore += $b
            $sumAfter += (Get-Item $rel).Length
        }
    }
}

Write-Output ''
Write-Output ("已处理文件: {0}KB -> {1}KB" -f [int]($sumBefore / 1KB), [int]($sumAfter / 1KB))
