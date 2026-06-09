# 下載 tcool.cc 期末新卷（需先以 Playwright 取得 cf_clearance）
# 用法：先把 cookie 寫進 data/_cf_cookie.json （{cf_clearance, PHPSESSID, ua}），再執行本腳本。
# 從 data/tcool_sweep_all.json 篩出 15 份新卷，下載題目卷(全部)＋答案卷(有的)到 pdfs_期末/。
$ErrorActionPreference = "Stop"
$ck = Get-Content "data/_cf_cookie.json" -Raw -Encoding utf8 | ConvertFrom-Json
$cookie = "cf_clearance=$($ck.cf_clearance)"
if ($ck.PHPSESSID) { $cookie += "; PHPSESSID=$($ck.PHPSESSID)" }
$headers = @{ Cookie = $cookie; "User-Agent" = $ck.ua; "Referer" = "https://www.tcool.cc/" }

$all = Get-Content "data/tcool_sweep_all.json" -Raw -Encoding utf8 | ConvertFrom-Json
$done = @("安和國小","民權國小","桃子腳國小")
$new = $all | Where-Object {
  $_.year_period -match "期末" -and -not ($done -contains $_.school) -and
  [int]([regex]::Match($_.year_period,'^(\d+)').Groups[1].Value) -ge 110
}
if (-not (Test-Path "pdfs_期末")) { New-Item -ItemType Directory "pdfs_期末" | Out-Null }

function Get-Pdf($path, $outfile) {
  if (Test-Path $outfile) { Write-Host "skip(exists): $outfile"; return $true }
  try {
    Invoke-WebRequest -Uri "https://www.tcool.cc$path" -Headers $headers -OutFile $outfile -TimeoutSec 60
    $sz = (Get-Item $outfile).Length
    $head = [System.IO.File]::ReadAllBytes($outfile)[0..3] -join ','
    if ($sz -lt 3000 -or $head -notmatch '37,80,68,70') {  # %PDF = 37,80,68,70
      Write-Host "BAD($sz bytes, head=$head): $outfile  -> 可能 Cloudflare 擋下，刪除"
      Remove-Item $outfile
      return $false
    }
    Write-Host ("OK {0,8} bytes : {1}" -f $sz, (Split-Path $outfile -Leaf))
    return $true
  } catch { Write-Host "ERR $($_.Exception.Message): $outfile"; if (Test-Path $outfile) { Remove-Item $outfile }; return $false }
}

$fail = 0
foreach ($r in $new) {
  $yp = ($r.year_period -replace '\s','')   # "111下期末2"
  $base = "$($r.city)_$($r.school)_$($yp)_自然康軒"
  if (-not (Get-Pdf $r.q "pdfs_期末/${base}_題目.pdf")) { $fail++ }
  if ($r.a) { if (-not (Get-Pdf $r.a "pdfs_期末/${base}_答案.pdf")) { $fail++ } }
}
Write-Host "`nDONE. fail=$fail (fail>0 多半是 cookie 過期，重取 cf_clearance 後重跑即可，已存檔會自動 skip)"
