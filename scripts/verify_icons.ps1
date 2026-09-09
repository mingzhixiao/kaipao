Add-Type -AssemblyName System.Drawing
$dir = "D:\test\kaipao\assets\icons"
$files = Get-ChildItem $dir -Filter *.png

Write-Host "=== VERIFYING 14 ICONS ALPHA & SIZES ==="
foreach ($f in $files) {
    $bmp = [System.Drawing.Bitmap]::FromFile($f.FullName)
    $tl = $bmp.GetPixel(2, 2)
    $tr = $bmp.GetPixel($bmp.Width - 3, 2)
    $bl = $bmp.GetPixel(2, $bmp.Height - 3)
    $br = $bmp.GetPixel($bmp.Width - 3, $bmp.Height - 3)
    $center = $bmp.GetPixel([int]($bmp.Width / 2), [int]($bmp.Height / 2))

    $cornerAlpha = "$($tl.A),$($tr.A),$($bl.A),$($br.A)"
    $centerAlpha = "$($center.A)"
    Write-Host ("{0,-18} {1}x{2}  Corners A:[{3}]  Center A:{4}  ({5:N0} KB)" -f $f.Name, $bmp.Width, $bmp.Height, $cornerAlpha, $centerAlpha, ($f.Length / 1024))
    $bmp.Dispose()
}
