param([string]$Voice = 'Microsoft Hanhan Desktop', [string[]]$ClipIds = @())
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$prototypeRoot = $PSScriptRoot
$audioDirectory = Join-Path $prototypeRoot 'assets/audio'
New-Item -ItemType Directory -Path $audioDirectory -Force | Out-Null
$narration = Get-Content -LiteralPath (Join-Path $prototypeRoot 'narration.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $speaker.SelectVoice($Voice)
  $speaker.Rate = -1
  foreach ($clip in $narration.PSObject.Properties) {
    if ($ClipIds.Count -gt 0 -and $clip.Name -notin $ClipIds) { continue }
    $temporaryWav = Join-Path $audioDirectory ('.' + $clip.Name + '.wav')
    $destinationMp3 = Join-Path $audioDirectory ($clip.Name + '.mp3')
    $speaker.SetOutputToWaveFile($temporaryWav)
    $speaker.Speak([string]$clip.Value)
    $speaker.SetOutputToNull()
    & ffmpeg -hide_banner -loglevel error -y -i $temporaryWav -codec:a libmp3lame -b:a 96k $destinationMp3
    if ($LASTEXITCODE -ne 0) { throw "MP3 encoding failed: $($clip.Name)" }
    & ffmpeg -hide_banner -loglevel error -i $destinationMp3 -f null -
    if ($LASTEXITCODE -ne 0) { throw "MP3 decode failed: $($clip.Name)" }
    Remove-Item -LiteralPath $temporaryWav
    Write-Output ('Built prototype narration: ' + $clip.Name)
  }
} finally { $speaker.Dispose() }
