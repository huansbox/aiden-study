# 掃描 tcool.cc 全台「三下·數學·康軒」清單（空 city + 空 period，分頁到底）
# 輸出 data/tcool_grade3_math_kanghsuan.json，事後再過濾期末+110下。
# 沿用 sweep_tcool.ps1（自然版）邏輯，僅 subject 改為「數學」。
$ErrorActionPreference = "Stop"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
$out = @()
$prevSig = ""
for ($p = 1; $p -le 60; $p++) {
    $r = Invoke-WebRequest -Uri "https://www.tcool.cc/" -Method POST -Body @{
        grade="3"; subject="數學"; semester="2"; period=""; publisher="康軒"; city=""; p="$p"
    } -Headers @{ "User-Agent" = $ua } -UseBasicParsing -TimeoutSec 40
    $html = $r.Content
    $blocks = [regex]::Matches($html, '(?s)<div class="result">(.*?)</div>\s*</div>\s*</div>')
    if ($blocks.Count -eq 0) {
        $blocks = [regex]::Matches($html, '(?s)<div class="result">(.*?)(?=<div class="result">|</div>\s*</div>\s*</div>\s*<)')
    }
    $rows = @()
    foreach ($b in $blocks) {
        $seg = $b.Value
        $school = [regex]::Match($seg, '<span class="school">(.*?)</span>').Groups[1].Value.Trim()
        $city   = [regex]::Match($seg, '<span class="city">(.*?)</span>').Groups[1].Value.Trim()
        $gs     = [regex]::Match($seg, '<span class="grade-subject">(.*?)</span>').Groups[1].Value.Trim()
        $yp     = [regex]::Match($seg, '<span class="year-period">(.*?)</span>').Groups[1].Value.Trim()
        $pub    = [regex]::Match($seg, '<span class="publisher">(.*?)</span>').Groups[1].Value.Trim()
        $q      = [regex]::Match($seg, 'href="(/d/q/[^"]+\.pdf)"').Groups[1].Value
        $a      = [regex]::Match($seg, 'href="(/d/a/[^"]+\.pdf)"').Groups[1].Value
        if ($school -and $q) {
            $rows += [PSCustomObject]@{ city=$city; school=$school; grade_subject=$gs; year_period=$yp; publisher=$pub; q=$q; a=$a }
        }
    }
    if ($rows.Count -eq 0) { Write-Host "p=$p : 0 rows, stop."; break }
    $sig = ($rows | ForEach-Object { $_.q }) -join "|"
    if ($sig -eq $prevSig) { Write-Host "p=$p : same as prev page, stop."; break }
    $prevSig = $sig
    $out += $rows
    Write-Host "p=$p : $($rows.Count) rows (累計 $($out.Count))"
}
$seen = @{}
$dedup = @()
foreach ($row in $out) {
    if (-not $seen.ContainsKey($row.q)) { $seen[$row.q] = $true; $dedup += $row }
}
$dedup | ConvertTo-Json -Depth 5 | Out-File -FilePath "data/tcool_grade3_math_kanghsuan.json" -Encoding utf8
Write-Host "TOTAL unique: $($dedup.Count) -> data/tcool_grade3_math_kanghsuan.json"
Write-Host "`n=== 期末 & >=110下 ==="
$dedup | Where-Object { $_.year_period -match "期末" } | ForEach-Object {
    $yr = [int]([regex]::Match($_.year_period, '^(\d+)').Groups[1].Value)
    if ($yr -ge 110) { "{0,-6} {1,-12} {2,-16} ans={3}" -f $_.city, $_.school, $_.year_period, [bool]$_.a }
}
