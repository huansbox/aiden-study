#Requires -Version 7.0
<#
Optional Windows-only credential storage for the weekly Native Camp runner.
Install only after the owner explicitly approves a persistent encrypted copy.
The key arrives through op run / OPENAI_API_KEY, never as a command argument.
DPAPI binds encryption to the Windows user. It is not protection against other
processes running as that user. Removing the local copy does not revoke the API key.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('status','install','remove','run','probe')][string]$Action,
    [string]$StoreDirectory = (Join-Path $env:LOCALAPPDATA 'AidenStudy/nativecamp'),
    [string]$Lesson,
    [ValidateSet('marin','cedar')][string]$Voice = 'cedar',
    [string]$Jobs,
    [string]$Manifest,
    [string]$AudioDir,
    [string]$RequestJournal,
    [int]$Limit = 0,
    [switch]$Check
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$credentialSecret = $null
$credentialSecure = $null
$credentialOriginal = $env:OPENAI_API_KEY
$credentialExit = 0

function Set-PrivateAcl([string]$Path, [bool]$Directory) {
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    if ($Directory) {
        $acl = [System.Security.AccessControl.DirectorySecurity]::new()
        $rule = [System.Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    } else {
        $acl = [System.Security.AccessControl.FileSecurity]::new()
        $rule = [System.Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'Allow')
    }
    $acl.SetOwner($identity)
    $acl.SetAccessRuleProtection($true, $false)
    $acl.AddAccessRule($rule)
    if ($Directory) {
        [IO.FileSystemAclExtensions]::SetAccessControl([IO.DirectoryInfo]::new($Path), $acl)
    } else {
        [IO.FileSystemAclExtensions]::SetAccessControl([IO.FileInfo]::new($Path), $acl)
    }
}

try {
    if (-not $IsWindows) { throw 'Windows required.' }
    $credentialRoot = [IO.Path]::GetFullPath($StoreDirectory)
    $credentialFile = Join-Path $credentialRoot 'openai.dpapi'
    if ((Test-Path -LiteralPath $credentialRoot) -and ((Get-Item -LiteralPath $credentialRoot).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Linked store refused.' }
    if ((Test-Path -LiteralPath $credentialFile) -and ((Get-Item -LiteralPath $credentialFile).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Linked file refused.' }

    if ($Action -eq 'remove') {
        if (Test-Path -LiteralPath $credentialFile) { Remove-Item -LiteralPath $credentialFile }
        Write-Output '{"status":"removed"}'
    } elseif ($Action -eq 'install') {
        if ([string]::IsNullOrWhiteSpace($env:OPENAI_API_KEY) -or $env:OPENAI_API_KEY.StartsWith('op://')) { throw 'Resolved environment key required.' }
        if (-not (Test-Path -LiteralPath $credentialRoot)) { $null = New-Item -ItemType Directory -Path $credentialRoot }
        Set-PrivateAcl $credentialRoot $true
        $credentialSecure = ConvertTo-SecureString -String $env:OPENAI_API_KEY -AsPlainText -Force
        $encrypted = ConvertFrom-SecureString -SecureString $credentialSecure
        # The same directory and ACL protect the encrypted staging file.
        $temporary = Join-Path $credentialRoot ('openai.' + [Guid]::NewGuid().ToString('N') + '.tmp')
        try {
            [IO.File]::WriteAllText($temporary, $encrypted)
            Set-PrivateAcl $temporary $false
            [IO.File]::Move($temporary, $credentialFile, $true)
        } finally {
            if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary }
        }
        Write-Output '{"status":"installed","protection":"Windows current-user DPAPI"}'
    } elseif (-not (Test-Path -LiteralPath $credentialFile)) {
        Write-Output '{"status":"missing"}'
        $credentialExit = 2
    } else {
        $credentialSecure = ConvertTo-SecureString -String ([IO.File]::ReadAllText($credentialFile))
        if ($credentialSecure.Length -eq 0) { throw 'Empty credential.' }
        if ($Action -eq 'status') {
            Write-Output '{"status":"ready","protection":"Windows current-user DPAPI"}'
        } elseif ($Action -eq 'probe') {
            $credentialSecret = ConvertFrom-SecureString -SecureString $credentialSecure -AsPlainText
            $response = Invoke-WebRequest -Uri 'https://api.openai.com/v1/models' -Headers @{Authorization=('Bearer ' + $credentialSecret)} -TimeoutSec 30 -SkipHttpErrorCheck
            Write-Output ('{"status":"probe","httpStatus":' + [int]$response.StatusCode + '}')
            if ($response.StatusCode -ne 200) { $credentialExit = 3 }
        } else {
            if (-not $Lesson -or -not $Jobs -or -not $Manifest -or $Limit -lt 0) { throw 'Audio arguments required.' }
            $builder = Join-Path $PSScriptRoot 'build_openai_audio.py'
            $audioArgs = @('run', '--python', '3.13', $builder, '--lesson', $Lesson, '--voice', $Voice, '--jobs', $Jobs, '--manifest', $Manifest)
            if ($AudioDir) { $audioArgs += @('--audio-dir', $AudioDir) }
            if ($RequestJournal) { $audioArgs += @('--request-journal', $RequestJournal) }
            if ($Limit -gt 0) { $audioArgs += @('--limit', [string]$Limit) }
            if ($Check) { $audioArgs += '--check' }
            $credentialSecret = ConvertFrom-SecureString -SecureString $credentialSecure -AsPlainText
            $env:OPENAI_API_KEY = $credentialSecret
            & uv @audioArgs
            $credentialExit = $LASTEXITCODE
        }
    }
} catch {
    # Do not print exception/request objects, headers, environment or key content.
    [Console]::Error.WriteLine('Credential action failed. Check local access and inputs; no secret was logged.')
    $credentialExit = 1
} finally {
    $env:OPENAI_API_KEY = $credentialOriginal
    $credentialSecret = $null
    if ($null -ne $credentialSecure) { $credentialSecure.Dispose() }
}
exit $credentialExit
