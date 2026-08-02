# Generates synthetic DSAA grid files and a synthetic meteorological CSV
# for the AQ Dashboard demo. All values are fabricated for demonstration
# purposes only and do not represent any real site or measurement.

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$gridDir = Join-Path $root "SampleData\Grids"
$metPath = Join-Path $root "SampleData\MetData.csv"

New-Item -ItemType Directory -Force -Path $gridDir | Out-Null

# Grid extent (UTM56S, km) - arbitrary coastal-QLD-like extent for demo purposes
$xMin = 318.0; $xMax = 342.0
$yMin = 7336.0; $yMax = 7369.0
$cols = 26
$rows = 34

# Pollutant prefix -> peak concentration used to scale the synthetic plume
$pollutants = @(
    @{ Prefix = "1"; Name = "PM10";  Peak = 45.0 },
    @{ Prefix = "2"; Name = "PM2.5"; Peak = 22.0 },
    @{ Prefix = "3"; Name = "SO2";   Peak = 320.0 },
    @{ Prefix = "4"; Name = "PAHs";  Peak = 0.0018 },
    @{ Prefix = "5"; Name = "F";     Peak = 3.2 }
)

function Write-DsaaFile {
    param(
        [string]$Path,
        [int]$Cols,
        [int]$Rows,
        [double]$XMin, [double]$XMax,
        [double]$YMin, [double]$YMax,
        $Data,
        [double]$ZMin,
        [double]$ZMax
    )

    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine("DSAA")
    [void]$sb.AppendLine("$Cols $Rows")
    [void]$sb.AppendLine("$XMin $XMax")
    [void]$sb.AppendLine("$YMin $YMax")
    [void]$sb.AppendLine("$($ZMin.ToString('0.0000E+00')) $($ZMax.ToString('0.0000E+00'))")

    for ($r = 0; $r -lt $Rows; $r++) {
        $rowValues = $Data[$r]
        $line = New-Object System.Text.StringBuilder
        for ($c = 0; $c -lt $Cols; $c++) {
            $v = $rowValues[$c]
            [void]$line.Append($v.ToString('0.0000E+00'))
            [void]$line.Append(' ')
        }
        [void]$sb.AppendLine($line.ToString().TrimEnd())
    }

    Set-Content -Path $Path -Value $sb.ToString() -NoNewline -Encoding ascii
}

function New-PlumeGrid {
    param(
        [int]$Cols, [int]$Rows,
        [double]$Peak,
        [double]$CenterColFrac, [double]$CenterRowFrac,
        [double]$SpreadCol, [double]$SpreadRow
    )

    $data = New-Object 'object[]' $Rows
    $cc = $CenterColFrac * $Cols
    $cr = $CenterRowFrac * $Rows

    for ($r = 0; $r -lt $Rows; $r++) {
        $rowValues = New-Object 'double[]' $Cols
        for ($c = 0; $c -lt $Cols; $c++) {
            $dc = ($c - $cc) / $SpreadCol
            $dr = ($r - $cr) / $SpreadRow
            $val = $Peak * [Math]::Exp(-($dc * $dc + $dr * $dr))
            if ($val -lt 0) { $val = 0 }
            $rowValues[$c] = $val
        }
        $data[$r] = $rowValues
    }
    return $data
}

$rng = New-Object System.Random(42)

foreach ($p in $pollutants) {
    # Max contour grid - single wide plume
    $maxData = New-PlumeGrid -Cols $cols -Rows $rows -Peak $p.Peak `
        -CenterColFrac 0.55 -CenterRowFrac 0.45 -SpreadCol 6.0 -SpreadRow 8.0

    $maxPath = Join-Path $gridDir "$($p.Prefix)_AED_Max.grd"
    Write-DsaaFile -Path $maxPath -Cols $cols -Rows $rows `
        -XMin $xMin -XMax $xMax -YMin $yMin -YMax $yMax `
        -Data $maxData -ZMin 0.0 -ZMax $p.Peak

    # Hourly timesteps - plume drifts and pulses over 12 steps
    for ($t = 1; $t -le 12; $t++) {
        $angle = ($t / 12.0) * 2 * [Math]::PI
        $centerCol = 0.5 + 0.15 * [Math]::Sin($angle)
        $centerRow = 0.45 + 0.12 * [Math]::Cos($angle)
        $pulse = 0.6 + 0.4 * [Math]::Sin($angle * 1.7)
        $peak = $p.Peak * $pulse

        $stepData = New-PlumeGrid -Cols $cols -Rows $rows -Peak $peak `
            -CenterColFrac $centerCol -CenterRowFrac $centerRow -SpreadCol 5.0 -SpreadRow 7.0

        $stepPath = Join-Path $gridDir "$($p.Prefix)_AED_Timestep_$($t.ToString('000')).grd"
        Write-DsaaFile -Path $stepPath -Cols $cols -Rows $rows `
            -XMin $xMin -XMax $xMax -YMin $yMin -YMax $yMax `
            -Data $stepData -ZMin 0.0 -ZMax $p.Peak
    }
}

Write-Host "Generated grid files in $gridDir"

# --- Synthetic meteorological CSV (same 4-header-line format the app expects) ---
$metLines = New-Object System.Collections.Generic.List[string]
$metLines.Add("Timestamps,Sample,Sample,Sample,Sample,Sample,Sample,Sample,Sample,Sample,Sample,Sample,Sample,Sample")
$metLines.Add("Timestamps,Wind speed @ 10 m,Wind speed @ 30 m,Wind direction @ 10 m,Wind direction @ 30 m,Temperature @ 2 m,Temperature @ 2 m,Temperature @ 10 m,Temperature @ 30 m,Relative humidity,Barometric Pressure,Vapour pressure,Saturation Vapour pressure,Solar Radiation")
$metLines.Add("Timestamps,m/sec,m/sec,deg,deg,deg C,deg C,deg C,deg C,%,hpa,kpa,kPa,w/m2")
$metLines.Add("Timestamps,SAMPLE:WS_10m,SAMPLE:WS_30m,SAMPLE:WD_10m,SAMPLE:WD_30m,SAMPLE:Temp_2m,SAMPLE:Temp_2m_b,SAMPLE:Temp_10m,SAMPLE:Temp_30m,SAMPLE:RH,SAMPLE:Baro,SAMPLE:Vapor,SAMPLE:SVP,SAMPLE:Solar")

$start = Get-Date "2026-01-01 00:00:00"
for ($i = 0; $i -lt 200; $i++) {
    $t = $start.AddMinutes($i * 5)
    $hourAngle = ($i / 12.0) * 2 * [Math]::PI
    $ws30 = [Math]::Round(2.5 + 2.0 * [Math]::Sin($hourAngle) + ($rng.NextDouble() - 0.5), 1)
    if ($ws30 -lt 0.1) { $ws30 = 0.1 }
    $wd30 = [Math]::Round((180 + 120 * [Math]::Sin($hourAngle * 0.7) + ($rng.NextDouble() - 0.5) * 20) % 360, 1)
    if ($wd30 -lt 0) { $wd30 += 360 }
    $ws10 = [Math]::Round($ws30 * 0.9, 1)
    $wd10 = $wd30
    $temp = [Math]::Round(22 + 4 * [Math]::Sin($hourAngle), 1)
    $rh = [Math]::Round(65 + 10 * [Math]::Cos($hourAngle), 1)

    $line = "$($t.ToString('MM-dd-yy H:mm')),$ws10,$ws30,$wd10,$wd30,$temp,$temp,$temp,$temp,$rh,1013.0,1.5,2.6,0.3"
    $metLines.Add($line)
}

Set-Content -Path $metPath -Value $metLines -Encoding ascii
Write-Host "Generated $metPath"
