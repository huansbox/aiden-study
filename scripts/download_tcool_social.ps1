# 下載 tcool.cc 三下社會康軒期末卷（需先以 Playwright 取得 cf_clearance 寫進 data/_cf_cookie.json）
# 篩選：現行課綱 ≥110下、期末（期末2/期末3）、有官方答案卷者，下載 題目卷＋答案卷 到 pdfs_社會/
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$ck = Get-Content "data/_cf_cookie.json" -Raw -Encoding utf8 | ConvertFrom-Json
$cookie = "cf_clearance=$($ck.cf_clearance)"
if ($ck.PHPSESSID) { $cookie += "; PHPSESSID=$($ck.PHPSESSID)" }
$headers = @{ Cookie = $cookie; "User-Agent" = $ck.ua; "Referer" = "https://www.tcool.cc/" }

$all = Get-Content "data/tcool_grade3_social_kanghsuan.json" -Raw -Encoding utf8 | ConvertFrom-Json
$sel = $all | Where-Object {
  $_.year_period -match "期末" -and
  [int]([regex]::Match($_.year_period,'^(\d+)').Groups[1].Value) -ge 110 -and
  $_.a   # 只收有答案卷的（官方答案批）
}
if (-not (Test-Path "pdfs_社會")) { New-Item -ItemType Directory "pdfs_社會" | Out-Null }

function Get-Pdf($path, $outfile) {
  if (Test-Path $outfile) { Write-Host "skip(exists): $(Split-Path $outfile -Leaf)"; return $true }
  try {
    Invoke-WebRequest -Uri "https://www.tcool.cc$path" -Headers $headers -OutFile $outfile -TimeoutSec 60
    $sz = (Get-Item $outfile).Length
    $head = [System.IO.File]::ReadAllBytes($outfile)[0..3] -join ','
    if ($sz -lt 3000 -or $head -notmatch '37,80,68,70') {
      Write-Host "BAD($sz bytes): $(Split-Path $outfile -Leaf) -> 刪除（cookie 可能過期）"; Remove-Item $outfile; return $false
    }
    Write-Host ("OK {0,8} bytes : {1}" -f $sz, (Split-Path $outfile -Leaf)); return $true
  } catch { Write-Host "ERR $($_.Exception.Message): $(Split-Path $outfile -Leaf)"; if (Test-Path $outfile) { Remove-Item $outfile }; return $false }
}

$fail = 0; $n = 0
foreach ($r in $sel) {
  $yp = ($r.year_period -replace '\s','')
  $base = "$($r.city)_$($r.school)_$($yp)_社會康軒"
  $n++
  if (-not (Get-Pdf $r.q "pdfs_社會/${base}_題目.pdf")) { $fail++ }
  if ($r.a) { if (-not (Get-Pdf $r.a "pdfs_社會/${base}_答案.pdf")) { $fail++ } }
}
Write-Host "`nSELECTED $n 卷. fail=$fail（fail>0 多半 cookie 過期，重取 cf_clearance 後重跑，已存檔自動 skip）"