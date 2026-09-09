. "$PSScriptRoot\IconKeyer.ps1"

$brainDir = "C:\Users\15199\.gemini\antigravity-ide\brain\61aabf1f-3c5d-4828-8c0a-1795a400b896"
$dstDir = "D:\test\kaipao\assets\icons"

# Test Coin first
[IconKeyer]::ProcessIcon("$brainDir\icon_coin_raw_1788879113993.jpg", "$dstDir\icon_coin.png", 10, 20)
