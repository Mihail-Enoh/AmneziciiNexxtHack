# WeCare — instalare și pornire pe Windows (PowerShell), pe o mașină goală.
#
#   powershell -ExecutionPolicy Bypass -File setup.ps1            instalează ce lipsește și pornește aplicația
#   powershell -ExecutionPolicy Bypass -File setup.ps1 -Check     rulează întâi testele și build-ul
#   powershell -ExecutionPolicy Bypass -File setup.ps1 -NoAI      fără cheia Featherless (fără funcțiile AI)
#   powershell -ExecutionPolicy Bypass -File setup.ps1 -Port 3000 alt port (implicit 8080)
#   powershell -ExecutionPolicy Bypass -File setup.ps1 -ResetKey  cere din nou cheia Featherless
#
# Pe Windows, varianta cea mai sigură rămâne WSL (Ubuntu) + setup.sh; acest script e echivalentul pentru PowerShell.
param([switch]$Check, [switch]$NoAI, [switch]$NoOpen, [switch]$ResetKey, [int]$Port = 8080)
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"   # descărcări mult mai rapide în PowerShell 5
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$BunVersion = "1.4.4"
$NodeVersion = "22.23.4"
$KeyFile = ".env.featherless.local"

function Step($t) { Write-Host "`n==> $t" -ForegroundColor White }
function Ok($t)   { Write-Host "  OK $t" -ForegroundColor Green }
function Warn($t) { Write-Host "  !  $t" -ForegroundColor Yellow }
function Die($t)  { Write-Host "  X  $t" -ForegroundColor Red; exit 1 }

Set-Location -Path $PSScriptRoot
if (-not (Test-Path "package.json") -or -not (Test-Path "bun.lock")) { Die "Rulează scriptul din folderul proiectului WeCare." }
if (-not [Environment]::Is64BitOperatingSystem) { Die "Este nevoie de Windows pe 64 de biți." }

function Add-UserPath($dir) {
  $env:Path = "$dir;$env:Path"
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not $userPath) { $userPath = "" }
  if ($userPath -notlike "*$dir*") { [Environment]::SetEnvironmentVariable("Path", "$dir;$userPath", "User") }
}

# ------------------------------------------------------------------ 1. Bun
Step "1/5 Bun"
$BunDir = Join-Path $env:USERPROFILE ".bun\bin"
if (Test-Path (Join-Path $BunDir "bun.exe")) { Add-UserPath $BunDir }
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  $tmp = Join-Path $env:TEMP "wecare-bun"; Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue; New-Item -ItemType Directory $tmp | Out-Null
  Write-Host "  Descarc Bun $BunVersion de pe GitHub..."
  try {
    Invoke-WebRequest "https://github.com/oven-sh/bun/releases/download/bun-v$BunVersion/bun-windows-x64.zip" -OutFile "$tmp\bun.zip" -UseBasicParsing
    Expand-Archive "$tmp\bun.zip" -DestinationPath $tmp -Force
    New-Item -ItemType Directory $BunDir -Force | Out-Null
    Copy-Item "$tmp\bun-windows-x64\bun.exe" (Join-Path $BunDir "bun.exe") -Force
  } catch {
    Warn "GitHub nu a răspuns; încerc installer-ul oficial."
    Invoke-RestMethod "https://bun.sh/install.ps1" | Invoke-Expression
  }
  Add-UserPath $BunDir
}
try { $bv = & bun --version } catch { Die "Bun nu a putut fi instalat. Vezi https://bun.sh/docs/installation" }
Ok "Bun $bv"

# ------------------------------------------------------------------ 2. Node.js
Step "2/5 Node.js (minim 22.12)"
$NodeDir = Join-Path $env:LOCALAPPDATA "wecare-node"
if (Test-Path (Join-Path $NodeDir "node.exe")) { Add-UserPath $NodeDir }
function Node-Ok {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return $false }
  $v = [version](& node -p "process.versions.node")
  return ($v.Major -gt 22) -or ($v.Major -eq 22 -and $v.Minor -ge 12) -or ($v.Major -eq 20 -and $v.Minor -ge 19)
}
if (-not (Node-Ok)) {
  $tmp = Join-Path $env:TEMP "wecare-node"; Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue; New-Item -ItemType Directory $tmp | Out-Null
  Write-Host "  Descarc Node.js $NodeVersion..."
  Remove-Item $NodeDir -Recurse -Force -ErrorAction SilentlyContinue; New-Item -ItemType Directory $NodeDir | Out-Null
  try {
    Invoke-WebRequest "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip" -OutFile "$tmp\node.zip" -UseBasicParsing
    Expand-Archive "$tmp\node.zip" -DestinationPath $tmp -Force
    Copy-Item "$tmp\node-v$NodeVersion-win-x64\*" $NodeDir -Recurse -Force
  } catch {
    Warn "nodejs.org nu a răspuns; folosesc același binar din registrul npm."
    Invoke-WebRequest "https://registry.npmjs.org/node-win-x64/-/node-win-x64-$NodeVersion.tgz" -OutFile "$tmp\node.tgz" -UseBasicParsing
    tar -xzf "$tmp\node.tgz" -C $tmp
    Copy-Item "$tmp\package\bin\node.exe" (Join-Path $NodeDir "node.exe") -Force
  }
  Add-UserPath $NodeDir
}
if (-not (Node-Ok)) { Die "Node.js nu a putut fi instalat. Instalează manual Node 22 de pe https://nodejs.org" }
Ok "Node.js $(& node -v)"

# ------------------------------------------------------------------ 3. dependențe
Step "3/5 Instalez dependențele (prima dată 1-3 minute)"
& bun install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { Warn "Instalarea exactă a eșuat; încerc normal."; & bun install; if ($LASTEXITCODE -ne 0) { Die "bun install a eșuat." } }
Ok "Dependențe instalate"

# ------------------------------------------------------------------ 4. configurare
Step "4/5 Configurare"
if (-not (Test-Path ".env")) { Die "Lipsește fișierul .env (Supabase). E inclus în repo; descarcă proiectul din nou." }
if ($ResetKey) { Remove-Item $KeyFile -ErrorAction SilentlyContinue }
if ($NoAI) { Warn "Fără AI: povestea, citirea documentelor și interpretarea de sănătate nu vor merge." }
elseif ($env:FEATHERLESS_API_KEY) { Ok "Folosesc FEATHERLESS_API_KEY din terminal" }
elseif (-not (Test-Path $KeyFile)) {
  Write-Host "  Lipește cheia Featherless (nu se afișează) sau apasă Enter ca să pornești fără AI:"
  $sec = Read-Host "  FEATHERLESS_API_KEY" -AsSecureString
  $key = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  if ($key) {
    "FEATHERLESS_API_KEY=$key`nFEATHERLESS_MODEL=Qwen/Qwen3-235B-A22B`nFEATHERLESS_VISION_MODEL=Qwen/Qwen2.5-VL-72B-Instruct`n" | Set-Content -Path $KeyFile -Encoding ASCII -NoNewline
    Ok "Cheie salvată în $KeyFile (nu ajunge în git)"
  } else { Warn "Pornesc fără AI. Adaugi cheia cu: setup.ps1 -ResetKey" }
}
if (-not $NoAI -and -not $env:FEATHERLESS_API_KEY -and (Test-Path $KeyFile)) {
  Get-Content $KeyFile | ForEach-Object { if ($_ -match '^\s*([A-Z_]+)=(.*)$') { Set-Item -Path "env:$($Matches[1])" -Value $Matches[2].Trim() } }
  Ok "Cheia Featherless e încărcată"
}

if ($Check) {
  & bun run test; if ($LASTEXITCODE -ne 0) { Die "Unele teste au picat." }
  & bun run build; if ($LASTEXITCODE -ne 0) { Die "Build-ul a eșuat." }
  Ok "Teste și build reușite"
}

# ------------------------------------------------------------------ 5. pornire
Step "5/5 Pornesc aplicația"
function Port-Busy($p) { try { $c = New-Object Net.Sockets.TcpClient; $c.Connect("127.0.0.1", $p); $c.Close(); return $true } catch { return $false } }
$start = $Port
while (Port-Busy $Port) { $Port++; if ($Port -gt $start + 20) { Die "Nu am găsit un port liber." } }
if ($Port -ne $start) { Warn "Portul $start e ocupat; folosesc $Port." }
$Url = "http://127.0.0.1:$Port/"
$job = Start-Process -FilePath "bun" -ArgumentList "run", "dev", "--port", "$Port", "--host", "127.0.0.1" -NoNewWindow -PassThru
Write-Host "  Aștept serverul (prima pornire ~1 minut)..."
$ready = $false
for ($i = 0; $i -lt 180; $i++) {
  if ($job.HasExited) { Die "Serverul s-a oprit la pornire (vezi mesajele de mai sus)." }
  try { $r = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch { }
  Start-Sleep -Seconds 1
}
if (-not $ready) { Die "Serverul nu răspunde după 3 minute." }
if ($r.Content -match "WeCare") { Ok "Pagina principală răspunde și conține WeCare" } else { Warn "Serverul răspunde, dar pagina nu conține WeCare." }
if (-not $NoOpen) { Start-Process $Url }
Write-Host "`n  WeCare rulează: $Url" -ForegroundColor Green
Write-Host "  Oprești cu Ctrl+C (sau închizi fereastra)."
Wait-Process -Id $job.Id
