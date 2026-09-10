Add-Type -AssemblyName System.Drawing

function Convert-ToTransparentPng {
    param(
        [string]$srcPath,
        [string]$dstPath,
        [string]$type = 'black'
    )
    $bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
    $outBmp = New-Object System.Drawing.Bitmap $bmp.Width, $bmp.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    
    $rect = New-Object System.Drawing.Rectangle 0, 0, $bmp.Width, $bmp.Height
    $srcData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $dstData = $outBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    $bytes = [Math]::Abs($srcData.Stride) * $bmp.Height
    $rgbValues = New-Object byte[] $bytes
    [System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $rgbValues, 0, $bytes)
    
    for ($i = 0; $i -lt $bytes; $i += 4) {
        $b = $rgbValues[$i]
        $g = $rgbValues[$i + 1]
        $r = $rgbValues[$i + 2]
        
        if ($type -eq 'white') {
            if ($r -gt 210 -and $g -gt 210 -and $b -gt 210) {
                $rgbValues[$i + 3] = 0
            } elseif ($r -gt 170 -and $g -gt 170 -and $b -gt 170) {
                $minVal = [Math]::Min($r, [Math]::Min($g, $b))
                $alpha = [int]((210 - $minVal) / 40.0 * 255.0)
                $rgbValues[$i + 3] = [Math]::Max(0, [Math]::Min(255, $alpha))
            }
        } elseif ($type -eq 'black') {
            $maxVal = [Math]::Max($r, [Math]::Max($g, $b))
            if ($maxVal -lt 28) {
                $rgbValues[$i + 3] = 0
            } elseif ($maxVal -lt 55) {
                $alpha = [int](($maxVal - 28) / 27.0 * 255.0)
                $rgbValues[$i + 3] = [Math]::Max(0, [Math]::Min(255, $alpha))
            }
        }
    }
    
    [System.Runtime.InteropServices.Marshal]::Copy($rgbValues, 0, $dstData.Scan0, $bytes)
    $bmp.UnlockBits($srcData)
    $outBmp.UnlockBits($dstData)
    $bmp.Dispose()
    
    $outBmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $outBmp.Dispose()
    Write-Host "Processed: $dstPath"
}

function Extract-TruckPng {
    param(
        [string]$srcPath,
        [string]$dstPath
    )
    $bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
    $w = $bmp.Width
    $h = $bmp.Height
    
    # Crop central 75% of vehicle
    $cropX = [int]($w * 0.12)
    $cropY = [int]($h * 0.12)
    $cropW = [int]($w * 0.76)
    $cropH = [int]($h * 0.76)
    
    $outBmp = New-Object System.Drawing.Bitmap $cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    $g = [System.Drawing.Graphics]::FromImage($outBmp)
    $srcRect = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropW, $cropH
    $destRect = New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH
    $g.DrawImage($bmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $bmp.Dispose()
    
    # Soft feather outer circular border
    $rect = New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH
    $data = $outBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $bytes = [Math]::Abs($data.Stride) * $cropH
    $rgbValues = New-Object byte[] $bytes
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $rgbValues, 0, $bytes)
    
    $cx = $cropW / 2.0
    $cy = $cropH / 2.0
    $maxR = $cropW * 0.48
    
    for ($y = 0; $y -lt $cropH; $y++) {
        for ($x = 0; $x -lt $cropW; $x++) {
            $idx = ($y * $cropW + $x) * 4
            $dx = $x - $cx
            $dy = $y - $cy
            $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
            
            if ($dist -gt $maxR) {
                $rgbValues[$idx + 3] = 0
            } elseif ($dist -gt ($maxR - 25)) {
                $fade = [int](($maxR - $dist) / 25.0 * 255.0)
                $rgbValues[$idx + 3] = [Math]::Min([int]$rgbValues[$idx + 3], $fade)
            }
        }
    }
    
    [System.Runtime.InteropServices.Marshal]::Copy($rgbValues, 0, $data.Scan0, $bytes)
    $outBmp.UnlockBits($data)
    $outBmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $outBmp.Dispose()
    Write-Host "Processed Truck: $dstPath"
}

function Convert-RogueGenColorKey {
    param(
        [string]$srcPath,
        [string]$dstPath,
        [double]$tolerance = 42.0,
        [double]$feather = 20.0
    )
    $bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
    $w = $bmp.Width
    $h = $bmp.Height
    $outBmp = New-Object System.Drawing.Bitmap $w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    
    $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
    $srcData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $dstData = $outBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    $bytes = [Math]::Abs($srcData.Stride) * $h
    $rgbValues = New-Object byte[] $bytes
    [System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $rgbValues, 0, $bytes)
    
    $stride = [Math]::Abs($srcData.Stride)
    
    # 8-probe sampling according to RogueGen
    $probes = @(
        @(5, 5), @($w-6, 5), @(5, $h-6), @($w-6, $h-6),
        @([int]($w/2), 5), @([int]($w/2), $h-6),
        @(5, [int]($h/2)), @($w-6, [int]($h/2))
    )
    $bgList = @()
    foreach ($p in $probes) {
        $idx = $p[1] * $stride + $p[0] * 4
        $b = [double]$rgbValues[$idx]
        $g = [double]$rgbValues[$idx+1]
        $r = [double]$rgbValues[$idx+2]
        $bgList += ,@($r, $g, $b)
    }
    
    # Average primary background color
    $sumR = 0; $sumG = 0; $sumB = 0
    foreach ($c in $bgList) {
        $sumR += $c[0]; $sumG += $c[1]; $sumB += $c[2]
    }
    $avgR = $sumR / $bgList.Count
    $avgG = $sumG / $bgList.Count
    $avgB = $sumB / $bgList.Count
    Write-Host "Auto-detected Background Palette: R=$([int]$avgR), G=$([int]$avgG), B=$([int]$avgB)"
    
    for ($i = 0; $i -lt $bytes; $i += 4) {
        $b = $rgbValues[$i]
        $g = $rgbValues[$i + 1]
        $r = $rgbValues[$i + 2]
        
        $dr = $r - $avgR
        $dg = $g - $avgG
        $db = $b - $avgB
        $dist = [Math]::Sqrt($dr*$dr + $dg*$dg + $db*$db)
        
        if ($dist -le $tolerance) {
            $rgbValues[$i + 3] = 0
        } elseif ($dist -lt ($tolerance + $feather)) {
            $alpha = [int](($dist - $tolerance) / $feather * 255.0)
            $rgbValues[$i + 3] = [Math]::Max(0, [Math]::Min(255, $alpha))
        } else {
            $rgbValues[$i + 3] = 255
        }
    }
    
    [System.Runtime.InteropServices.Marshal]::Copy($rgbValues, 0, $dstData.Scan0, $bytes)
    $bmp.UnlockBits($srcData)
    $outBmp.UnlockBits($dstData)
    $bmp.Dispose()
    
    $outBmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $outBmp.Dispose()
    Write-Host "Processed with RogueGen color key: $dstPath"
}

Convert-ToTransparentPng -srcPath "D:\test\kaipao\assets\enemy_runner.jpg" -dstPath "D:\test\kaipao\assets\enemy_runner.png" -type 'black'
Convert-ToTransparentPng -srcPath "D:\test\kaipao\assets\enemy_charger.jpg" -dstPath "D:\test\kaipao\assets\enemy_charger.png" -type 'white'
Convert-ToTransparentPng -srcPath "D:\test\kaipao\assets\enemy_behemoth.jpg" -dstPath "D:\test\kaipao\assets\enemy_behemoth.png" -type 'black'
Convert-ToTransparentPng -srcPath "D:\test\kaipao\assets\hero.jpg" -dstPath "D:\test\kaipao\assets\hero.png" -type 'black'
Extract-TruckPng -srcPath "D:\test\kaipao\assets\icon_truck.jpg" -dstPath "D:\test\kaipao\assets\truck_sprite.png"
Convert-RogueGenColorKey -srcPath "D:\test\kaipao\assets\boss_overlord.jpg" -dstPath "D:\test\kaipao\assets\boss_overlord.png" -tolerance 36.0 -feather 20.0
