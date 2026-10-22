<#
.SYNOPSIS
    Setup akses OpenCode dari HP (Android) ke PC ini.

.DESCRIPTION
    Script ini:
      1. (Opsional) Update CLI OpenCode supaya versinya sama dengan service.
      2. Set password server OpenCode.
      3. Mode Remote -> jalankan `opencode pair --remote` (link + QR, via OpenTunnel).
         Mode Lan    -> listen di 0.0.0.0 + buka firewall, akses via IP lokal.

.PARAMETER Mode
    Remote (default) = akses dari mana saja lewat OpenTunnel.
    Lan              = hanya dari Wi-Fi yang sama.

.PARAMETER Port
    Port web UI OpenCode di Windows. Default 28894.

.PARAMETER SkipUpdate
    Lewati langkah update CLI (kalau versi sudah cocok).

.PARAMETER OpenFirewall
    Paksa buka firewall walaupun Mode = Remote (biasanya tidak perlu).

.EXAMPLE
    .\opencode-remote.ps1
    .\opencode-remote.ps1 -Mode Lan
    .\opencode-remote.ps1 -SkipUpdate
    .\opencode-remote.ps1 -DisableRemote
#>
[CmdletBinding()]
param(
    [ValidateSet('Remote', 'Lan')]
    [string]$Mode = 'Remote',

    [int]$Port = 28894,

    [switch]$SkipUpdate,

    [switch]$OpenFirewall,

    [switch]$DisableRemote
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn2($msg){ Write-Host "    !   $msg" -ForegroundColor Yellow }

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p  = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-LanIPv4 {
    try {
        Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
            Sort-Object InterfaceMetric |
            Select-Object -First 1 -ExpandProperty IPAddress
    } catch {
        (Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway } | Select-Object -First 1).IPv4Address.IPAddress
    }
}

# ---------------------------------------------------------------- header
Write-Host @"
============================================================
  OpenCode Remote Access Setup
  Mode : $Mode
  Port : $Port
============================================================
"@ -ForegroundColor Magenta

if ($DisableRemote) {
    Write-Step 'Mematikan remote access'
    opencode service set remote false
    Write-Ok 'Remote access dimatikan. Sesi yang sudah ada tetap jalan sampai logout/expired.'
    return
}

# ---------------------------------------------------------------- cek CLI
Write-Step 'Cek instalasi OpenCode'
$cmd = Get-Command opencode -ErrorAction SilentlyContinue
if (-not $cmd) {
    throw "Perintah 'opencode' tidak ditemukan di PATH. Install dulu: npm i -g @opencode/cli@latest"
}
$before = (& opencode --version) -join ' '
Write-Ok "Terpasang: $before"

# ---------------------------------------------------------------- update
if (-not $SkipUpdate) {
    Write-Step 'Update CLI ke versi terbaru (service akan dihentikan sementara)'
    Write-Warn2 'Semua sesi OpenCode yang sedang aktif akan terputus.'
    try { & opencode service stop } catch { Write-Warn2 'Service belum jalan / gagal stop, lanjut.' }

    try {
        & npm i -g '@opencode/cli@latest'
        if ($LASTEXITCODE -ne 0) { throw "npm keluar dengan kode $LASTEXITCODE" }
    } catch {
        Write-Warn2 "Update gagal: $($_.Exception.Message)"
        Write-Warn2 'Kalau errornya EPERM/EBUSY: tutup OpenCode Desktop & semua terminal OpenCode, lalu ulangi.'
        throw
    }
    $after = (& opencode --version) -join ' '
    Write-Ok "Sekarang: $after"
} else {
    Write-Warn2 'Update dilewati (-SkipUpdate).'
}

# ---------------------------------------------------------------- password
Write-Step 'Set password server'
Write-Host '    Password ini yang dipakai dari HP. Minimal 16 karakter, jangan dipakai di tempat lain.' -ForegroundColor Gray

$pwd1 = Read-Host '    Password baru' -AsSecureString
$pwd2 = Read-Host '    Ulangi password' -AsSecureString

$plain1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pwd1))
$plain2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pwd2))

try {
    if ($plain1 -ne $plain2) { throw 'Password tidak sama.' }
    if ($plain1.Length -lt 16) {
        Write-Warn2 "Password hanya $($plain1.Length) karakter (disarankan >= 16)."
        $ans = Read-Host '    Tetap lanjut? (y/N)'
        if ($ans -notmatch '^(y|ya|yes)$') { throw 'Dibatalkan oleh user.' }
    }

    & opencode service set password $plain1
    if ($LASTEXITCODE -ne 0) { throw "Gagal set password (exit $LASTEXITCODE)." }
    Write-Ok 'Password tersimpan.'
}
finally {
    # bersihkan dari memori sedapat mungkin
    $plain1 = $null; $plain2 = $null
    [GC]::Collect()
}

# ---------------------------------------------------------------- mode
if ($Mode -eq 'Remote') {
    Write-Step 'Aktifkan remote access (OpenTunnel)'
    Write-Host @'
    Yang akan terjadi:
      - Server OpenCode bisa diakses dari internet.
      - Trafik end-to-end encrypted, akses butuh password tadi.
      - Muncul link sekali pakai (expired 5 menit) + QR code.

    Di HP: scan QR, atau buka link-nya di Chrome.
'@ -ForegroundColor Gray

    $ans = Read-Host '    Lanjut expose ke internet? (y/N)'
    if ($ans -notmatch '^(y|ya|yes)$') {
        Write-Warn2 'Dibatalkan. Tidak ada perubahan pada mode remote.'
        return
    }

    & opencode pair --remote
    Write-Ok 'Selesai. Kalau link sudah expired, jalankan lagi: opencode pair --remote'
}
else {
    Write-Step 'Aktifkan akses LAN'
    & opencode service set hostname 0.0.0.0
    & opencode service set port $Port
    & opencode service start
    Write-Ok 'Service jalan di 0.0.0.0.'

    if ($OpenFirewall -or $Mode -eq 'Lan') {
        if (Test-Admin) {
            $ruleName = "OpenCode Web UI ($Port)"
            $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
            if (-not $existing) {
                New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP `
                    -LocalPort $Port -Action Allow -Profile Private | Out-Null
                Write-Ok "Firewall rule dibuat (profil Private): TCP $Port"
            } else {
                Write-Ok "Firewall rule sudah ada: $ruleName"
            }
        } else {
            Write-Warn2 'Bukan Administrator: firewall tidak diubah.'
            Write-Warn2 "Jalankan PowerShell as Administrator lalu: New-NetFirewallRule -DisplayName 'OpenCode Web UI ($Port)' -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private"
        }
    }

    $ip = Get-LanIPv4
    Write-Host @"

    Buka di HP (harus Wi-Fi yang sama):
        http://${ip}:$Port

    Masukkan password yang tadi diset.
"@ -ForegroundColor Green
}

# ---------------------------------------------------------------- status
Write-Step 'Status service'
try { & opencode service status } catch { Write-Warn2 'Service belum aktif.' }

Write-Host @"

------------------------------------------------------------
Selesai.

  Matikan remote : .\opencode-remote.ps1 -DisableRemote
  Cek status     : opencode service status
  Link baru      : opencode pair --remote

PENTING: siapa pun yang punya akses ke web UI ini bisa
menjalankan perintah shell dan mengubah file di PC ini.
Jangan bagikan link/password-nya.
------------------------------------------------------------
"@ -ForegroundColor DarkGray
