$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$assetsDirectory = Join-Path $projectRoot 'assets'
New-Item -ItemType Directory -Path $assetsDirectory -Force | Out-Null
$outputPath = Join-Path $assetsDirectory 'daybook-splash.png'

$bitmap = New-Object System.Drawing.Bitmap 512, 512,
  ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::Transparent)

$markPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$markPath.AddArc(44, 44, 144, 144, 180, 90)
$markPath.AddArc(324, 44, 144, 144, 270, 90)
$markPath.AddArc(324, 324, 144, 144, 0, 90)
$markPath.AddArc(44, 324, 144, 144, 90, 90)
$markPath.CloseFigure()
$markBrush = New-Object System.Drawing.SolidBrush (
  [System.Drawing.ColorTranslator]::FromHtml('#356859')
)
$graphics.FillPath($markBrush, $markPath)

$leafPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$leafPath.StartFigure()
$leafPath.AddBezier(145, 337, 139, 224, 221, 132, 371, 123)
$leafPath.AddBezier(371, 123, 385, 258, 327, 369, 197, 383)
$leafPath.AddBezier(197, 383, 171, 371, 151, 354, 145, 337)
$leafPath.CloseFigure()
$leafBrush = New-Object System.Drawing.SolidBrush (
  [System.Drawing.ColorTranslator]::FromHtml('#FCFAF6')
)
$graphics.FillPath($leafBrush, $leafPath)

$veinPen = New-Object System.Drawing.Pen (
  [System.Drawing.ColorTranslator]::FromHtml('#356859'),
  18
)
$veinPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$veinPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawLine($veinPen, 178, 356, 334, 166)
$graphics.DrawLine($veinPen, 231, 292, 183, 286)
$graphics.DrawLine($veinPen, 270, 247, 273, 190)
$graphics.DrawLine($veinPen, 208, 324, 172, 324)
$graphics.DrawLine($veinPen, 305, 205, 336, 164)

$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$veinPen.Dispose()
$leafBrush.Dispose()
$leafPath.Dispose()
$markBrush.Dispose()
$markPath.Dispose()
$graphics.Dispose()
$bitmap.Dispose()

Write-Output $outputPath
