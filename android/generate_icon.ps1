# =============================================================================
# Sahakar Seva — launcher icon generator
#
# Regenerates the Android launcher icon set (adaptive + legacy, all densities)
# with a premium, minimal mark representing HOME + COMMUNITY + COOPERATION +
# TRUST. Uses System.Drawing (GDI+) exactly like the original generator noted in
# MIGRATION_NOTES.md §10.
#
# Design:
#   - Indigo brand background (#4338ca) with a soft lighter-indigo radial glow.
#   - White house silhouette with a rounded, friendly roof (HOME).
#   - A warm-gold cooperative "embrace" arc cradling the house (COMMUNITY / TRUST
#     / COOPERATION) plus a small gold hearth dot inside the doorway.
#   - No text. Strong silhouette. Reads at small sizes.
#
# Package id, signing, and app name are NOT touched by this script — it only
# writes PNG assets into res/mipmap-*.
# =============================================================================

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$resDir = Join-Path $PSScriptRoot 'app\src\main\res'
$repoRoot = Split-Path $PSScriptRoot -Parent

# Brand palette
$indigo       = [System.Drawing.Color]::FromArgb(255, 67, 56, 202)   # #4338ca primary700
$indigoGlow   = [System.Drawing.Color]::FromArgb(255, 99, 92, 230)   # lighter radial center
$indigoDeep   = [System.Drawing.Color]::FromArgb(255, 49, 46, 129)   # #312e81 primary900 edge
$white        = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
$gold         = [System.Drawing.Color]::FromArgb(255, 251, 191, 36)  # #fbbf24 accent400
$goldDeep     = [System.Drawing.Color]::FromArgb(255, 245, 158, 11)  # #f59e0b accent500

function New-Bitmap([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  return @{ Bitmap = $bmp; Graphics = $g }
}

# Fills the whole canvas with the indigo brand gradient + radial glow.
function Draw-Background($g, [int]$size) {
  # base vertical gradient indigo -> deeper indigo
  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $lin = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $indigo, $indigoDeep, 90)
  $g.FillRectangle($lin, $rect)
  $lin.Dispose()

  # soft radial glow, upper-center
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glowR = [int]($size * 0.75)
  $cx = $size * 0.5
  $cy = $size * 0.40
  $path.AddEllipse(($cx - $glowR), ($cy - $glowR), ($glowR * 2), ($glowR * 2))
  $pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
  $pgb.CenterPoint = New-Object System.Drawing.PointF($cx, $cy)
  $pgb.CenterColor = [System.Drawing.Color]::FromArgb(150, $indigoGlow.R, $indigoGlow.G, $indigoGlow.B)
  $pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, $indigo.R, $indigo.G, $indigo.B))
  $g.FillPath($pgb, $path)
  $pgb.Dispose(); $path.Dispose()
}

# Draws the house + cooperative arc mark, centered, scaled to `scale` fraction of canvas.
# The mark is rendered onto its OWN transparent bitmap so the doorway is a TRUE transparent
# cut-out (correct on both the transparent adaptive foreground AND the legacy composite —
# on the foreground the indigo background layer shows through the door at runtime).
function Draw-Mark($g, [int]$size, [double]$scale) {
  $u = $size * $scale          # mark bounding size
  $cx = $size * 0.5
  $cy = $size * 0.5
  $top  = $cy - $u / 2.0

  # ---- render the mark on a private transparent layer ----
  $layer = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $lg = [System.Drawing.Graphics]::FromImage($layer)
  $lg.SmoothingMode   = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $lg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  # Cooperative embrace arc (gold), cradling the house from below
  $arcPen = New-Object System.Drawing.Pen($gold, [single]($u * 0.115))
  $arcPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $arcPen.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
  $arcSize = $u * 0.94
  $arcLeft = $cx - $arcSize / 2.0
  $arcTop  = $cy - $arcSize / 2.0 + $u * 0.05
  $lg.DrawArc($arcPen, [single]$arcLeft, [single]$arcTop, [single]$arcSize, [single]$arcSize, 22, 136)
  $arcPen.Dispose()

  # House body + roof (white), rounded, friendly
  $whiteBrush = New-Object System.Drawing.SolidBrush($white)
  $houseW = $u * 0.60
  $houseTop = $top + $u * 0.08
  $roofH = $u * 0.29
  $bodyH = $u * 0.35
  $bodyTop = $houseTop + $roofH
  $bodyLeft = $cx - $houseW / 2.0
  $eaves = $u * 0.075

  # Roof (rounded corners via wide round pen of same color)
  $roof = New-Object System.Drawing.Drawing2D.GraphicsPath
  $apex = New-Object System.Drawing.PointF([single]$cx, [single]$houseTop)
  $rl   = New-Object System.Drawing.PointF([single]($bodyLeft - $eaves), [single]$bodyTop)
  $rr   = New-Object System.Drawing.PointF([single]($bodyLeft + $houseW + $eaves), [single]$bodyTop)
  $roof.AddLine($rl, $apex); $roof.AddLine($apex, $rr); $roof.AddLine($rr, $rl); $roof.CloseFigure()
  $roofPen = New-Object System.Drawing.Pen($white, [single]($u * 0.055))
  $roofPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $lg.DrawPath($roofPen, $roof); $lg.FillPath($whiteBrush, $roof)
  $roofPen.Dispose(); $roof.Dispose()

  # Body (rounded rectangle)
  $bodyRadius = $u * 0.055
  $body = New-Object System.Drawing.Drawing2D.GraphicsPath
  $bx = $bodyLeft; $by = $bodyTop; $bw = $houseW; $bh = $bodyH; $d = $bodyRadius * 2
  $body.AddArc([single]$bx, [single]$by, [single]$d, [single]$d, 180, 90)
  $body.AddArc([single]($bx + $bw - $d), [single]$by, [single]$d, [single]$d, 270, 90)
  $body.AddArc([single]($bx + $bw - $d), [single]($by + $bh - $d), [single]$d, [single]$d, 0, 90)
  $body.AddArc([single]$bx, [single]($by + $bh - $d), [single]$d, [single]$d, 90, 90)
  $body.CloseFigure()
  $lg.FillPath($whiteBrush, $body)
  $body.Dispose(); $whiteBrush.Dispose()

  # Doorway: TRUE transparent cut-out (erase the house pixels through the door path)
  $doorW = $houseW * 0.32
  $doorH = $bodyH * 0.64
  $doorLeft = $cx - $doorW / 2.0
  $doorTop  = $bodyTop + $bodyH - $doorH
  $doorRadius = $doorW * 0.5
  $door = New-Object System.Drawing.Drawing2D.GraphicsPath
  $dd = $doorRadius * 2
  $door.AddArc([single]$doorLeft, [single]$doorTop, [single]$dd, [single]$dd, 180, 180)
  $door.AddLine([single]($doorLeft + $doorW), [single]($doorTop + $doorRadius), [single]($doorLeft + $doorW), [single]($doorTop + $doorH))
  $door.AddLine([single]($doorLeft + $doorW), [single]($doorTop + $doorH), [single]$doorLeft, [single]($doorTop + $doorH))
  $door.CloseFigure()
  $lg.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $clearBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  $lg.FillPath($clearBrush, $door)
  $clearBrush.Dispose(); $door.Dispose()
  $lg.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver

  # Gold hearth dot inside the doorway (warmth / service)
  $dotR = $doorW * 0.28
  $dotBrush = New-Object System.Drawing.SolidBrush($gold)
  $lg.FillEllipse($dotBrush, [single]($cx - $dotR), [single]($doorTop + $doorH * 0.40 - $dotR), [single]($dotR * 2), [single]($dotR * 2))
  $dotBrush.Dispose()

  $lg.Dispose()
  # composite the finished mark onto the target
  $g.DrawImage($layer, 0, 0, $size, $size)
  $layer.Dispose()
}

function Save-Png($bmp, [string]$path) {
  $dir = Split-Path $path -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

# Adaptive layer sizes (108dp canvas) per density
$adaptiveSizes = @{
  'mdpi'    = 108
  'hdpi'    = 162
  'xhdpi'   = 216
  'xxhdpi'  = 324
  'xxxhdpi' = 432
}
# Legacy icon sizes (48dp) per density
$legacySizes = @{
  'mdpi'    = 48
  'hdpi'    = 72
  'xhdpi'   = 96
  'xxhdpi'  = 144
  'xxxhdpi' = 192
}

Write-Host "Generating adaptive background + foreground layers..."
foreach ($d in $adaptiveSizes.Keys) {
  $sz = $adaptiveSizes[$d]

  # background layer (full bleed brand gradient)
  $bg = New-Bitmap $sz
  Draw-Background $bg.Graphics $sz
  Save-Png $bg.Bitmap (Join-Path $resDir "mipmap-$d\ic_launcher_background.png")
  $bg.Graphics.Dispose(); $bg.Bitmap.Dispose()

  # foreground layer (transparent; mark drawn within the adaptive safe zone of the 108dp canvas)
  $fg = New-Bitmap $sz
  Draw-Mark $fg.Graphics $sz 0.56
  Save-Png $fg.Bitmap (Join-Path $resDir "mipmap-$d\ic_launcher_foreground.png")
  $fg.Graphics.Dispose(); $fg.Bitmap.Dispose()
}

Write-Host "Generating legacy square + round icons..."
foreach ($d in $legacySizes.Keys) {
  $sz = $legacySizes[$d]

  # square legacy: background + mark, then rounded corners for modern launchers
  $sq = New-Bitmap $sz
  Draw-Background $sq.Graphics $sz
  Draw-Mark $sq.Graphics $sz 0.66
  # rounded-corner mask (~18% radius)
  $rounded = New-Bitmap $sz
  $rr = $sz * 0.18
  $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
  $dd = $rr * 2
  $clip.AddArc(0, 0, $dd, $dd, 180, 90)
  $clip.AddArc(($sz - $dd), 0, $dd, $dd, 270, 90)
  $clip.AddArc(($sz - $dd), ($sz - $dd), $dd, $dd, 0, 90)
  $clip.AddArc(0, ($sz - $dd), $dd, $dd, 90, 90)
  $clip.CloseFigure()
  $rounded.Graphics.SetClip($clip)
  $rounded.Graphics.DrawImage($sq.Bitmap, 0, 0, $sz, $sz)
  Save-Png $rounded.Bitmap (Join-Path $resDir "mipmap-$d\ic_launcher.png")
  $clip.Dispose(); $rounded.Graphics.Dispose(); $rounded.Bitmap.Dispose()

  # round legacy: same composite clipped to a circle
  $circle = New-Bitmap $sz
  $cpath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $cpath.AddEllipse(0, 0, $sz, $sz)
  $circle.Graphics.SetClip($cpath)
  $circle.Graphics.DrawImage($sq.Bitmap, 0, 0, $sz, $sz)
  Save-Png $circle.Bitmap (Join-Path $resDir "mipmap-$d\ic_launcher_round.png")
  $cpath.Dispose(); $circle.Graphics.Dispose(); $circle.Bitmap.Dispose()

  $sq.Graphics.Dispose(); $sq.Bitmap.Dispose()
}

Write-Host "Generating 512px Play Store icon..."
$ps = New-Bitmap 512
Draw-Background $ps.Graphics 512
Draw-Mark $ps.Graphics 512 0.66
Save-Png $ps.Bitmap (Join-Path $repoRoot 'ic_launcher_playstore.png')
$ps.Graphics.Dispose(); $ps.Bitmap.Dispose()

# In-app brand logo — the SAME mark as the launcher icon, rounded-corner, exported at RN's
# @1x/@2x/@3x densities into src/assets so the login header can render an <Image> that is
# pixel-identical to the app icon. Base logical size 56dp (matches the header logo box).
Write-Host "Generating in-app brand logo (logo.png @1x/2x/3x)..."
$assetsDir = Join-Path $repoRoot 'src\assets'
if (-not (Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null }
$logoVariants = @{ 'logo.png' = 56; 'logo@2x.png' = 112; 'logo@3x.png' = 168 }
foreach ($name in $logoVariants.Keys) {
  $sz = $logoVariants[$name]
  # composite (background + mark), same 0.66 mark scale as the launcher
  $comp = New-Bitmap $sz
  Draw-Background $comp.Graphics $sz
  Draw-Mark $comp.Graphics $sz 0.66
  # rounded corners (~24% radius, matches theme radiusLg feel at this size)
  $lg = New-Bitmap $sz
  $rr = $sz * 0.24
  $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
  $dd = $rr * 2
  $clip.AddArc(0, 0, $dd, $dd, 180, 90)
  $clip.AddArc(($sz - $dd), 0, $dd, $dd, 270, 90)
  $clip.AddArc(($sz - $dd), ($sz - $dd), $dd, $dd, 0, 90)
  $clip.AddArc(0, ($sz - $dd), $dd, $dd, 90, 90)
  $clip.CloseFigure()
  $lg.Graphics.SetClip($clip)
  $lg.Graphics.DrawImage($comp.Bitmap, 0, 0, $sz, $sz)
  Save-Png $lg.Bitmap (Join-Path $assetsDir $name)
  $clip.Dispose(); $lg.Graphics.Dispose(); $lg.Bitmap.Dispose()
  $comp.Graphics.Dispose(); $comp.Bitmap.Dispose()
}

Write-Host "Done. Icon + logo assets regenerated."
