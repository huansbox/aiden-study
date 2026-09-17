param(
    [Parameter(Mandatory = $true)][string]$JobsPath,
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [ValidateRange(-10, 10)][int]$Rate = -2,
    [string]$VoiceName = 'Microsoft Zira Desktop - English (United States)'
)
$ErrorActionPreference = 'Stop'
$ttsJobs = Get-Content -Raw -LiteralPath $JobsPath -Encoding UTF8 | ConvertFrom-Json
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$ttsVoice = New-Object -ComObject SAPI.SpVoice
$ttsSelected = @($ttsVoice.GetVoices() | Where-Object { $_.GetDescription() -eq $VoiceName })
if ($ttsSelected.Count -ne 1) { throw 'The requested SAPI voice is unavailable.' }
$ttsVoice.Voice = $ttsSelected[0]
$ttsVoice.Rate = $Rate
$ttsVoice.Volume = 100
foreach ($ttsJob in $ttsJobs) {
    if ($ttsJob.id -notmatch '^[a-z0-9-]+$' -or [string]::IsNullOrWhiteSpace($ttsJob.text)) {
        throw 'Invalid speech job.'
    }
    $ttsPath = Join-Path $OutputDirectory ($ttsJob.id + '.wav')
    $ttsStream = New-Object -ComObject SAPI.SpFileStream
    try {
        $ttsStream.Format.Type = 22
        $ttsStream.Open($ttsPath, 3, $false)
        $ttsVoice.AudioOutputStream = $ttsStream
        $null = $ttsVoice.Speak($ttsJob.text, 0)
    } finally {
        $ttsStream.Close()
    }
}
Write-Output "Generated $($ttsJobs.Count) SAPI WAV files at rate $Rate."
