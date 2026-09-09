Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile("D:\test\kaipao\assets\icons\icon_coin.png")
$tl = $b.GetPixel(0, 0)
$center = $b.GetPixel(256, 256)
Write-Host "Corner: A=$($tl.A) R=$($tl.R) G=$($tl.G) B=$($tl.B)"
Write-Host "Center: A=$($center.A) R=$($center.R) G=$($center.G) B=$($center.B)"
$b.Dispose()
