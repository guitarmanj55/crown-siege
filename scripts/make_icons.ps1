# Render the app icons in icons/: a gold crown over a stone keep on the dusk-purple brand colour.
# Run from the repo root: powershell -File scripts\make_icons.ps1
Add-Type -AssemblyName System.Drawing
$out = Join-Path $PSScriptRoot "..\icons"
New-Item -ItemType Directory -Force $out | Out-Null

function P($x, $y) { New-Object System.Drawing.PointF ([single]$x), ([single]$y) }

function Make-Icon($size, $name, $art) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"
  $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $sky = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.ColorTranslator]::FromHtml("#1c1736")), ([System.Drawing.ColorTranslator]::FromHtml("#c4626a")), 90
  $g.FillRectangle($sky, $rect)
  # art occupies the centre $art fraction of the icon
  $s = $size * $art
  $ox = ($size - $s) / 2
  $oy = ($size - $s) / 2
  $stone = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#2a2236"))
  # keep silhouette: wall with crenellations and two turrets
  $g.FillRectangle($stone, $ox + $s * 0.18, $oy + $s * 0.62, $s * 0.64, $s * 0.38)
  for ($i = 0; $i -lt 5; $i++) { $g.FillRectangle($stone, $ox + $s * (0.18 + $i * 0.14), $oy + $s * 0.56, $s * 0.08, $s * 0.07) }
  $g.FillRectangle($stone, $ox + $s * 0.08, $oy + $s * 0.48, $s * 0.16, $s * 0.52)
  $g.FillRectangle($stone, $ox + $s * 0.76, $oy + $s * 0.48, $s * 0.16, $s * 0.52)
  $g.FillPolygon($stone, @((P ($ox + $s * 0.05) ($oy + $s * 0.49)), (P ($ox + $s * 0.16) ($oy + $s * 0.34)), (P ($ox + $s * 0.27) ($oy + $s * 0.49))))
  $g.FillPolygon($stone, @((P ($ox + $s * 0.73) ($oy + $s * 0.49)), (P ($ox + $s * 0.84) ($oy + $s * 0.34)), (P ($ox + $s * 0.95) ($oy + $s * 0.49))))
  # gold crown
  $gold = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#f1c75b"))
  $crown = @(
    (P ($ox + $s * 0.26) ($oy + $s * 0.46)), (P ($ox + $s * 0.22) ($oy + $s * 0.12)), (P ($ox + $s * 0.38) ($oy + $s * 0.28)),
    (P ($ox + $s * 0.50) ($oy + $s * 0.04)), (P ($ox + $s * 0.62) ($oy + $s * 0.28)), (P ($ox + $s * 0.78) ($oy + $s * 0.12)),
    (P ($ox + $s * 0.74) ($oy + $s * 0.46)))
  $g.FillPolygon($gold, $crown)
  $gem = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#7fd4ff"))
  $g.FillEllipse($gem, $ox + $s * 0.455, $oy + $s * 0.33, $s * 0.09, $s * 0.09)
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Make-Icon 192 "icon-192.png" 0.8
Make-Icon 512 "icon-512.png" 0.8
Make-Icon 512 "icon-maskable-512.png" 0.6   # smaller art stays inside the maskable safe zone
Make-Icon 180 "apple-touch-icon.png" 0.8
