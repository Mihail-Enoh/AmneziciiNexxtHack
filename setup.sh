#!/usr/bin/env bash
# WeCare — instalare și pornire pe o mașină goală (Linux, macOS sau Windows prin WSL).
#
#   bash setup.sh                 instalează tot ce lipsește și pornește aplicația
#   bash setup.sh --check         la fel, dar rulează întâi testele și build-ul
#   bash setup.sh --no-ai         nu cere cheia Featherless (aplicația merge, fără funcțiile AI)
#   bash setup.sh --port 3000     alt port (implicit 8080; dacă e ocupat, îl caută pe următorul liber)
#   bash setup.sh --no-open       nu deschide browserul
#   bash setup.sh --reset-key     cere din nou cheia Featherless
#
# Scriptul se poate rula de câte ori vrei: ce e deja instalat nu se reinstalează.
# Oprești aplicația cu Ctrl+C.
set -euo pipefail

BUN_VERSION="1.4.4"          # versiunile cu care a fost testat proiectul
NODE_VERSION="22.23.4"
DEFAULT_PORT=8080
KEY_FILE=".env.featherless.local"   # ignorat de git (regula *.local din .gitignore)

# ------------------------------------------------------------------ mesaje
if [ -t 1 ]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; N=$'\e[0m'; else B=""; G=""; Y=""; R=""; N=""; fi
step() { printf '\n%s==> %s%s\n' "$B" "$*" "$N"; }
ok()   { printf '%s  ✓ %s%s\n' "$G" "$*" "$N"; }
warn() { printf '%s  ! %s%s\n' "$Y" "$*" "$N"; }
die()  { printf '%s  ✗ %s%s\n' "$R" "$*" "$N" >&2; exit 1; }

# ------------------------------------------------------------------ opțiuni
CHECK=0; NO_AI=0; OPEN=1; RESET_KEY=0; PORT="$DEFAULT_PORT"
while [ $# -gt 0 ]; do
  case "$1" in
    --check) CHECK=1 ;;
    --no-ai) NO_AI=1 ;;
    --no-open) OPEN=0 ;;
    --reset-key) RESET_KEY=1 ;;
    --port) shift; PORT="${1:-}"; [[ "$PORT" =~ ^[0-9]+$ ]] || die "--port are nevoie de un număr" ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) die "Opțiune necunoscută: $1 (vezi: bash setup.sh --help)" ;;
  esac
  shift
done

# Rulăm din folderul proiectului, oriunde ar fi apelat scriptul.
cd "$(dirname "$0")"
[ -f package.json ] && [ -f bun.lock ] || die "Rulează scriptul din folderul proiectului WeCare (acolo unde e package.json)."

# ------------------------------------------------------------------ 1. sistem
step "1/7 Verific sistemul"
OS="$(uname -s)"; ARCH="$(uname -m)"
IS_WSL=0; grep -qi microsoft /proc/version 2>/dev/null && IS_WSL=1
case "$OS" in
  Linux)  ok "Linux ($ARCH)$([ $IS_WSL = 1 ] && echo ', WSL')" ;;
  Darwin) ok "macOS ($ARCH)" ;;
  MINGW*|MSYS*|CYGWIN*) die "Pe Windows folosește WSL (Ubuntu) sau scriptul setup.ps1 din PowerShell." ;;
  *) die "Sistem necunoscut: $OS" ;;
esac

SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then SUDO="sudo"; fi

install_pkgs() {  # instalează pachete de sistem cu managerul disponibil
  if command -v apt-get >/dev/null 2>&1; then $SUDO apt-get update -qq && $SUDO apt-get install -y -qq "$@"
  elif command -v dnf >/dev/null 2>&1; then $SUDO dnf install -y -q "$@"
  elif command -v yum >/dev/null 2>&1; then $SUDO yum install -y -q "$@"
  elif command -v pacman >/dev/null 2>&1; then $SUDO pacman -Sy --noconfirm --needed "$@"
  elif command -v zypper >/dev/null 2>&1; then $SUDO zypper --non-interactive install "$@"
  elif command -v apk >/dev/null 2>&1; then $SUDO apk add --no-cache "$@"
  elif command -v brew >/dev/null 2>&1; then brew install "$@"
  else return 1; fi
}

missing=()
for tool in curl unzip tar; do command -v "$tool" >/dev/null 2>&1 || missing+=("$tool"); done
if [ ${#missing[@]} -gt 0 ]; then
  warn "Lipsesc: ${missing[*]} — le instalez (poate cere parola de administrator)."
  install_pkgs "${missing[@]}" || die "Nu le-am putut instala automat. Instalează manual: ${missing[*]}"
fi
ok "curl, unzip și tar sunt disponibile"

# ------------------------------------------------------------------ 2. Bun
step "2/7 Bun (instalează pachetele și pornește aplicația)"
BUN_DIR="$HOME/.bun"
export PATH="$BUN_DIR/bin:$PATH"

bun_target() {
  local os arch
  case "$OS" in Linux) os=linux ;; Darwin) os=darwin ;; esac
  case "$ARCH" in x86_64|amd64) arch=x64 ;; aarch64|arm64) arch=aarch64 ;; *) die "Procesor nesuportat de Bun: $ARCH" ;; esac
  # Procesoare x64 mai vechi, fără AVX2, au nevoie de varianta "baseline".
  if [ "$arch" = x64 ] && [ "$os" = linux ] && ! grep -q avx2 /proc/cpuinfo 2>/dev/null; then arch="x64-baseline"; fi
  if [ "$arch" = x64 ] && [ "$os" = darwin ] && [ "$(sysctl -n machdep.cpu.leaf7_features 2>/dev/null | grep -c AVX2)" = 0 ]; then arch="x64-baseline"; fi
  echo "bun-$os-$arch"
}

install_bun() {
  local target tmp
  target="$(bun_target)"
  tmp="$(mktemp -d)"
  echo "  Descarc Bun $BUN_VERSION ($target) de pe GitHub…"
  if curl -fsSL --retry 3 -o "$tmp/bun.zip" "https://github.com/oven-sh/bun/releases/download/bun-v$BUN_VERSION/$target.zip"; then
    unzip -q -o "$tmp/bun.zip" -d "$tmp"
    mkdir -p "$BUN_DIR/bin"
    mv -f "$tmp/$target/bun" "$BUN_DIR/bin/bun"
    chmod +x "$BUN_DIR/bin/bun"
    ln -sf bun "$BUN_DIR/bin/bunx"
  else
    warn "GitHub nu a răspuns; încerc installer-ul oficial de pe bun.sh."
    curl -fsSL https://bun.sh/install | bash -s "bun-v$BUN_VERSION"
  fi
  rm -rf "$tmp"
  # Ca `bun` să meargă și în terminalele deschise de acum încolo.
  for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
    if [ -f "$rc" ] || [ "$(basename "$rc")" = ".bashrc" ]; then
      grep -q 'BUN_INSTALL=' "$rc" 2>/dev/null || printf '\n# bun\nexport BUN_INSTALL="$HOME/.bun"\nexport PATH="$BUN_INSTALL/bin:$PATH"\n' >> "$rc"
    fi
  done
}

if command -v bun >/dev/null 2>&1 && bun --version >/dev/null 2>&1; then
  ok "Bun $(bun --version) e deja instalat"
else
  install_bun
  command -v bun >/dev/null 2>&1 && bun --version >/dev/null 2>&1 || die "Bun nu a putut fi instalat. Vezi https://bun.sh/docs/installation"
  ok "Bun $(bun --version) instalat în $BUN_DIR/bin"
fi

# ------------------------------------------------------------------ 3. Node.js
step "3/7 Node.js (necesar pentru Vite și teste; versiunea minimă 22.12)"
NODE_DIR="$HOME/.local/share/wecare-node"
export PATH="$NODE_DIR/bin:$PATH"

node_ok() {  # Vite 8 cere Node ^20.19 sau >=22.12
  command -v node >/dev/null 2>&1 || return 1
  local v major minor
  v="$(node -p 'process.versions.node' 2>/dev/null)" || return 1
  major="${v%%.*}"; minor="$(echo "$v" | cut -d. -f2)"
  [ "$major" -gt 22 ] || { [ "$major" = 22 ] && [ "$minor" -ge 12 ]; } || { [ "$major" = 20 ] && [ "$minor" -ge 19 ]; }
}

install_node() {
  local os arch tmp
  case "$OS" in Linux) os=linux ;; Darwin) os=darwin ;; esac
  case "$ARCH" in x86_64|amd64) arch=x64 ;; aarch64|arm64) arch=arm64 ;; *) die "Procesor nesuportat de Node.js: $ARCH" ;; esac
  tmp="$(mktemp -d)"
  echo "  Descarc Node.js $NODE_VERSION ($os-$arch)…"
  rm -rf "$NODE_DIR"; mkdir -p "$NODE_DIR"
  if curl -fsSL --retry 3 -o "$tmp/node.tgz" "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-$os-$arch.tar.gz"; then
    tar -xzf "$tmp/node.tgz" -C "$NODE_DIR" --strip-components=1
  elif curl -fsSL --retry 3 -o "$tmp/node.tgz" "https://registry.npmjs.org/node-$os-$arch/-/node-$os-$arch-$NODE_VERSION.tgz"; then
    # Rezervă: același binar oficial, publicat în registrul npm.
    tar -xzf "$tmp/node.tgz" -C "$NODE_DIR" --strip-components=1
  else
    rm -rf "$tmp"; die "Nu am putut descărca Node.js. Instalează manual Node 22: https://nodejs.org"
  fi
  rm -rf "$tmp"
  for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
    if [ -f "$rc" ] || [ "$(basename "$rc")" = ".bashrc" ]; then
      grep -q 'wecare-node' "$rc" 2>/dev/null || printf '\n# node pentru WeCare\nexport PATH="$HOME/.local/share/wecare-node/bin:$PATH"\n' >> "$rc"
    fi
  done
}

if node_ok; then
  ok "Node.js $(node -v) e deja instalat"
else
  command -v node >/dev/null 2>&1 && warn "Node.js $(node -v 2>/dev/null) e prea vechi; instalez $NODE_VERSION doar pentru utilizatorul tău."
  install_node
  node_ok || die "Node.js nu a putut fi instalat corect."
  ok "Node.js $(node -v) instalat în $NODE_DIR"
fi

# ------------------------------------------------------------------ 4. dependențe
step "4/7 Instalez dependențele proiectului (prima dată durează 1–3 minute)"
if bun install --frozen-lockfile; then ok "Dependențe instalate exact ca în bun.lock"
else
  warn "Instalarea exactă a eșuat; încerc o instalare normală."
  bun install || die "bun install a eșuat. Verifică conexiunea la internet și rulează din nou."
  ok "Dependențe instalate"
fi

# ------------------------------------------------------------------ 5. configurare
step "5/7 Configurare"
[ -f .env ] || die "Lipsește fișierul .env (adresa Supabase pentru autentificare). E inclus în repo; descarcă proiectul din nou."
ok ".env (Supabase: autentificare) există"

if [ "$RESET_KEY" = 1 ]; then rm -f "$KEY_FILE"; fi
if [ "$NO_AI" = 1 ]; then
  warn "Fără AI: povestea de pe prima pagină, citirea documentelor și interpretarea de sănătate nu vor merge. Restul aplicației merge."
elif [ -n "${FEATHERLESS_API_KEY:-}" ]; then
  ok "Folosesc FEATHERLESS_API_KEY din terminal"
elif [ -f "$KEY_FILE" ]; then
  ok "Cheia Featherless e salvată în $KEY_FILE"
elif [ -t 0 ]; then
  echo "  Funcțiile AI folosesc Featherless (https://featherless.ai). Lipește cheia API (nu se afișează),"
  echo "  sau apasă Enter ca să pornești fără AI:"
  read -r -s -p "  FEATHERLESS_API_KEY: " KEY; echo
  if [ -n "$KEY" ]; then
    umask 077
    {
      printf 'FEATHERLESS_API_KEY=%s\n' "$KEY"
      printf 'FEATHERLESS_MODEL=%s\n' "Qwen/Qwen3-235B-A22B"
      printf 'FEATHERLESS_VISION_MODEL=%s\n' "Qwen/Qwen2.5-VL-72B-Instruct"
    } > "$KEY_FILE"
    ok "Cheie salvată în $KEY_FILE (doar pe acest calculator, nu ajunge în git)"
  else
    warn "Pornesc fără AI. Poți adăuga cheia oricând: bash setup.sh --reset-key"
  fi
else
  warn "Nu e un terminal interactiv și nu există cheie: pornesc fără AI."
fi
if [ -f "$KEY_FILE" ] && [ "$NO_AI" = 0 ] && [ -z "${FEATHERLESS_API_KEY:-}" ]; then set -a; . "./$KEY_FILE"; set +a; fi

# ------------------------------------------------------------------ 6. verificări (opțional)
if [ "$CHECK" = 1 ]; then
  step "6/7 Rulez testele și build-ul"
  bun run test || die "Unele teste au picat (vezi mai sus)."
  ok "Teste trecute"
  bun run build >/tmp/wecare-build.log 2>&1 || { tail -30 /tmp/wecare-build.log; die "Build-ul a eșuat."; }
  ok "Build reușit"
else
  step "6/7 Teste: sărite (rulează cu --check ca să le incluzi)"
fi

# ------------------------------------------------------------------ 7. pornire
step "7/7 Pornesc aplicația"
port_busy() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }
start_port="$PORT"
while port_busy "$PORT"; do PORT=$((PORT + 1)); [ "$PORT" -gt $((start_port + 20)) ] && die "Nu am găsit un port liber după $start_port."; done
[ "$PORT" != "$start_port" ] && warn "Portul $start_port e ocupat; folosesc $PORT."
URL="http://127.0.0.1:$PORT/"
LOG="$(mktemp -t wecare-dev.XXXXXX.log)"

bun run dev --port "$PORT" --host 127.0.0.1 >"$LOG" 2>&1 &
DEV_PID=$!
cleanup() { kill "$DEV_PID" 2>/dev/null || true; wait "$DEV_PID" 2>/dev/null || true; }
trap 'echo; echo "Opresc aplicația…"; cleanup; exit 0' INT TERM

echo "  Aștept să pornească serverul (prima pornire poate dura ~1 minut)…"
ready=0
for _ in $(seq 1 180); do
  if ! kill -0 "$DEV_PID" 2>/dev/null; then tail -40 "$LOG"; die "Serverul s-a oprit la pornire (jurnal: $LOG)."; fi
  if curl -fsS -o /dev/null "$URL" 2>/dev/null; then ready=1; break; fi
  sleep 1
done
[ "$ready" = 1 ] || { tail -40 "$LOG"; die "Serverul nu răspunde după 3 minute (jurnal: $LOG)."; }

# Verificare reală: pagina principală se încarcă și e chiar WeCare.
if curl -fsS "$URL" | grep -q "WeCare"; then ok "Pagina principală răspunde și conține WeCare"
else warn "Serverul răspunde, dar pagina nu conține „WeCare”. Verifică în browser."; fi

if [ "$OPEN" = 1 ]; then
  if [ "$IS_WSL" = 1 ] && command -v cmd.exe >/dev/null 2>&1; then cmd.exe /c start "" "$URL" >/dev/null 2>&1 || true
  elif [ "$OS" = Darwin ]; then open "$URL" || true
  elif command -v xdg-open >/dev/null 2>&1 && { [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]; }; then xdg-open "$URL" >/dev/null 2>&1 || true
  fi
fi

printf '\n%s  WeCare rulează: %s%s\n' "$G$B" "$URL" "$N"
[ -f "$KEY_FILE" ] || [ -n "${FEATHERLESS_API_KEY:-}" ] || echo "  (fără AI — vezi README, secțiunea Configurare)"
echo "  Jurnalul serverului: $LOG"
echo "  Oprești cu Ctrl+C."
wait "$DEV_PID"
