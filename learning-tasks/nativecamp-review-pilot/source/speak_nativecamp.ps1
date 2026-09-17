param(
    [Parameter(Mandatory = $true)][string]$JobsPath,
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][string]$WorkDirectory,
    [string]$VoiceName = 'Microsoft Zira Desktop - English (United States)'
)
$ErrorActionPreference = 'Stop'
$ncJobs = Get-Content -Raw -LiteralPath $JobsPath -Encoding UTF8 | ConvertFrom-Json
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $WorkDirectory -Force | Out-Null
$ncVoice = New-Object -ComObject SAPI.SpVoice
$ncSelectedVoice = @($ncVoice.GetVoices() | Where-Object { $_.GetDescription() -eq $VoiceName })
if ($ncSelectedVoice.Count -ne 1) { throw "Required local SAPI voice not found: $VoiceName" }
$ncVoice.Voice = $ncSelectedVoice[0]
$ncVoice.Rate = -1
$ncVoice.Volume = 100
foreach ($ncJob in $ncJobs) {
    if ($ncJob.file -notmatch '^[a-z0-9-]+\.mp3$' -or [string]::IsNullOrWhiteSpace($ncJob.text)) {
        throw 'Invalid speech job'
    }
    $ncWavePath = Join-Path $WorkDirectory ($ncJob.file -replace '\.mp3$', '.wav')
    $ncTargetPath = Join-Path $OutputDirectory $ncJob.file
    $ncStream = New-Object -ComObject SAPI.SpFileStream
    try {
        $ncStream.Format.Type = 22
        $ncStream.Open($ncWavePath, 3, $false)
        $ncVoice.AudioOutputStream = $ncStream
        $null = $ncVoice.Speak($ncJob.text, 0)
    } finally {
        $ncStream.Close()
    }
    & ffmpeg -hide_banner -nostdin -v error -xerror -y -i $ncWavePath -ar 44100 -ac 1 -c:a libmp3lame -q:a 4 -map_metadata -1 $ncTargetPath
    if ($LASTEXITCODE -ne 0) { throw "MP3 conversion failed: $($ncJob.file)" }
}
Write-Output "Generated $($ncJobs.Count) local SAPI recordings."
