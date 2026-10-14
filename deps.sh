#!/usr/bin/env bash
# ============================================================
#  钢铁意志 · PI 版 —— 依赖扫描 / 自动安装 / 镜像源
#
#  用法:
#    bash deps.sh scan                 # 只扫描，列出已装/缺失（不修改系统）
#    bash deps.sh install              # 装缺失的核心依赖
#    bash deps.sh install --with-optional   # 连可选技能依赖一起装
#    bash deps.sh mirrors              # 打印本机选定的镜像源
#    bash deps.sh mirrors --apply-global    # 把镜像写入 pip/npm 全局配置
# ============================================================
set -uo pipefail
G='\033[1;32m'; Y='\033[1;33m'; R='\033[1;31m'; C='\033[1;36m'; D='\033[2m'; N='\033[0m'
ok(){ printf "${G}✓${N} %s\n" "$*"; }
no(){ printf "${R}✗${N} %s\n" "$*"; }
wr(){ printf "${Y}!${N} %s\n" "$*"; }
hd(){ printf "\n${C}== %s ==${N}\n" "$*"; }
PMODE="${1:-scan}"; shift || true
WITH_OPT=0
for a in "$@"; do [ "$a" = "--with-optional" ] && WITH_OPT=1; done
APPLY_GLOBAL=0
for a in "$@"; do [ "$a" = "--apply-global" ] && APPLY_GLOBAL=1; done

# ================= 1. 环境探测 =================
detect(){
  OS_ID=unknown; OS_VER=""; OS_LIKE=""; PM=""; SUDO=""
  if [ -r /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release; OS_ID="${ID:-unknown}"; OS_VER="${VERSION_ID:-}"; OS_LIKE="${ID_LIKE:-}"
  fi
  case "$OS_ID" in
    debian|ubuntu|raspbian|linuxmint|pop|kali|deepin|uos) PM=apt ;;
    fedora|rocky|almalinux|rhel|centos|ol) PM=dnf; command -v dnf >/dev/null 2>&1 || PM=yum ;;
    alpine) PM=apk ;;
    arch|manjaro|endeavouros) PM=pacman ;;
    opensuse*|sles|opensuse-leap) PM=zypper ;;
    *) case "$(uname -s)" in
         Darwin) PM=brew ;;
         MINGW*|MSYS*|CYGWIN*) PM=winget ;;
         *) PM="" ;;
       esac ;;
  esac
  ARCH="$(uname -m)"
  [ "$(id -u)" = "0" ] || SUDO="sudo"
  HAVE_SYSTEMD=0; command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ] && HAVE_SYSTEMD=1
}
detect

# ================= 2. 镜像源表 =================
# 每个源都有【官方】和【国内镜像】两条路，按连通性自动选
M_APT_OFFICIAL=""; M_APT_CN1="https://mirrors.tuna.tsinghua.edu.cn"; M_APT_CN2="https://mirrors.aliyun.com"; M_APT_CN3="https://mirrors.ustc.edu.cn"
M_PIP_OFFICIAL="https://pypi.org/simple"
M_PIP_CN1="https://pypi.tuna.tsinghua.edu.cn/simple"
M_PIP_CN2="https://mirrors.aliyun.com/pypi/simple"
M_PIP_CN3="https://mirrors.cloud.tencent.com/pypi/simple"
M_NPM_OFFICIAL="https://registry.npmjs.org"
M_NPM_CN1="https://registry.npmmirror.com"
M_NPM_CN2="https://mirrors.cloud.tencent.com/npm"
M_GITHUB_OFFICIAL="https://github.com"
M_GITHUB_CN1="https://ghfast.top"          # 前缀式：${M_GITHUB_CN1}/https://github.com/...
M_GITHUB_CN2="https://gh-proxy.com"
M_GITHUB_CN3="https://ghproxy.net"
M_NODE_CN1="https://npmmirror.com/mirrors/node"
M_PW_CN1="https://npmmirror.com/mirrors/playwright"

probe(){ # $1=url  $2=超时秒  连通且非 4xx/5xx 视为可用；失败重试一次
  command -v curl >/dev/null 2>&1 || return 1
  local code i
  for i in 1 2; do
    code=$(curl -s -o /dev/null -w '%{http_code}' -m "${2:-8}" -L "$1" 2>/dev/null) || code=""
    [ -n "$code" ] && [ "$code" -lt 500 ] 2>/dev/null && return 0
    sleep 1
  done
  return 1
}
IN_CN=0
case "$(cat /etc/timezone 2>/dev/null)$(date +%Z 2>/dev/null)" in *Shanghai*|*CST*|*Asia/China*) IN_CN=1;; esac
pick(){ # 依次试，返回第一个可用的（国内环境给镜像更长超时）
  for u in "$@"; do
    [ -z "$u" ] && continue
    if [ "$IN_CN" = 1 ]; then probe "$u" 10 && { echo "$u"; return 0; }
    else probe "$u" 6 && { echo "$u"; return 0; }; fi
  done
  return 1
}
resolve_mirrors(){
  hd "镜像源探测（官方 vs 国内镜像）"
  PIP_SRC="$(pick "$M_PIP_CN1" "$M_PIP_CN2" "$M_PIP_CN3" "$M_PIP_OFFICIAL" || echo "$M_PIP_OFFICIAL")"
  NPM_SRC="$(pick "$M_NPM_CN1" "$M_NPM_CN2" "$M_NPM_OFFICIAL" || echo "$M_NPM_OFFICIAL")"
  GH_PROXY="$(pick "$M_GITHUB_CN1" "$M_GITHUB_CN2" "$M_GITHUB_CN3" || echo "")"
  APT_CN="$(pick "$M_APT_CN1" "$M_APT_CN2" "$M_APT_CN3" || echo "")"
  [ "$IN_CN" = 1 ] && echo "  ${D}（检测到国内网络环境，镜像优先 + 更长超时）${N}"
  echo "  pip   : $PIP_SRC"
  echo "  npm   : $NPM_SRC"
  echo "  apt   : ${APT_CN:-（保持系统原配置）}"
  if [ -n "${GH_PROXY:-}" ]; then echo "  github: 经加速 $GH_PROXY"; else echo "  github: 直连"; fi
}
gh_url(){ # GitHub 资源地址 -> 视情况走加速
  local u="$1"
  if [ -n "${GH_PROXY:-}" ]; then echo "${GH_PROXY}/$u"; else echo "$u"; fi
}

# ================= 3. 依赖清单（按裸机假设）=================
# 系统包：随发行版映射包名
declare -A SPKGS=(
  [python3]="python3|python3|python3"
  [pip]="python3-pip|python3-pip|py3-pip"
  [venv]="python3-venv|python3-virtualenv|"
  [curl]="curl|curl|curl"
  [wget]="wget|wget|wget"
  [git]="git|git|git"
  [cacert]="ca-certificates|ca-certificates|ca-certificates"
  [unzip]="unzip|unzip|unzip"
  [tar]="tar|tar|tar"
  [gzip]="gzip|gzip|gzip"
  [jq]="jq|jq|jq"
  [rsync]="rsync|rsync|rsync"
  [cc]="build-essential|gcc-c++ make|build-base"
  [tzdata]="tzdata|tzdata|tzdata"
)
pkgname(){ # key -> 本发行版包名
  IFS='|' read -r a b c <<<"${SPKGS[$1]}"
  case "$PM" in apt) echo "$a";; dnf|yum) echo "$b";; apk) echo "$c";; pacman) echo "$a";; zypper) echo "$a";; *) echo "$a";; esac
}

# 命令 -> 检查可执行文件
CMDS_REQUIRED="python3 curl git"
CMDS_OPTIONAL="jq rsync unzip wget tar gzip"
# Python 包：核心 0 个（引擎纯标准库）；可选列表为技能依赖
PIP_CORE=""                       # 核心不需要任何 pip 包
PIP_OPT="edge-tts"                # 语音技能
PIP_SKILLS="pillow numpy imageio pypdf pdfplumber pdf2image openpyxl lxml defusedxml pyyaml playwright"  # 官方技能用
# Node 包
NPM_CORE_PRJ="@xenova/transformers vectra pi-mcp-adapter"
NPM_OPT_G="@ast-grep/cli lean-ctx-bin"
# 独立二进制（附官方与镜像两条获取路径）
BIN_RTK="https://github.com/rtk-ai/rtk/releases/latest/download/rtk-linux-${AARCH:-x86_64}"
BIN_LIGHTPANDA="https://github.com/lightpanda-io/browser/releases/latest/download/lightpanda-${ARCH}"

# ================= 4. 扫描 =================
scan(){
  hd "环境"
  echo "  系统    : ${OS_ID} ${OS_VER} (${OS_LIKE:-n/a})"
  echo "  架构    : $ARCH"
  echo "  包管理器: ${PM:-未识别}"
  echo "  权限    : $([ -n "$SUDO" ] && echo 需要 sudo || echo root)"
  echo "  systemd : $([ "$HAVE_SYSTEMD" = 1 ] && echo 可用 || echo 不可用（服务将降级为手工启动）)"
  hd "命令依赖"
  for c in $CMDS_REQUIRED; do
    if command -v "$c" >/dev/null 2>&1; then ok "$(printf '%-12s %s' "$c" "$($c --version 2>&1 | head -1 | cut -c1-42)")"
    else no "$(printf '%-12s 缺失（必需）' "$c")"; fi
  done
  for c in $CMDS_OPTIONAL; do
    command -v "$c" >/dev/null 2>&1 && ok "$(printf '%-12s %s' "$c" 已装)" || wr "$(printf '%-12s 缺失（可选）' "$c")"
  done
  hd "Node / npm"
  if command -v node >/dev/null 2>&1; then ok "node $(node -v)"
  else
    PN="${XDG_DATA_HOME:-$HOME/.local/share}/pi-node/current/bin"
    [ -x "$PN/node" ] && ok "node $(node -v 2>/dev/null)（pi 托管）" || no "node 缺失"
  fi
  command -v npm >/dev/null 2>&1 && ok "npm $(npm -v)" || wr "npm 缺失"
  hd "Python 包（核心：无需任何 pip 包，引擎为纯标准库）"
  local p
  for p in $PIP_OPT; do
    if python3 -c "import importlib.util,sys;sys.exit(0 if importlib.util.find_spec('$p') else 1)" 2>/dev/null; then
      ok "$p 已装"
    else
      wr "$p 缺失（可选：语音技能）"
    fi
  done
  hd "Node 包（~/.pi/agent）"
  local AG="${PI_HOME:-$HOME/.pi}/agent"
  for p in $NPM_CORE_PRJ; do
    [ -d "$AG/node_modules/$p" ] && ok "$p 已装" || no "$p 缺失（核心）"
  done
  printf "  ${D}注：typebox / @earendil-works/pi-coding-agent / jiti 由 pi 底座自带，不在 node_modules，无需安装${N}\n"
  hd "可选外部二进制（技能用，缺了只是少个能力）"
  for b in rtk lean-ctx lightpanda scrapling-mcp scrapling agent-reach ast-grep playwright tvly yt-dlp fd bili; do
    loc="$(command -v "$b" 2>/dev/null)"
    for d in "$HOME/.local/bin" "/usr/local/bin" "/usr/bin"; do
      [ -n "$loc" ] && break
      [ -x "$d/$b" ] && loc="$d/$b"
    done
    if [ -n "$loc" ]; then
      case ":$PATH:" in *":$(dirname "$loc"):"*) ok "$(printf '%-14s %s' "$b" "$loc")";;
        *) wr "$(printf '%-14s %s（不在 PATH 上）' "$b" "$loc")";; esac
    else wr "$(printf '%-14s 未装（可选）' "$b")"; fi
  done
  hd "框架自检"
  local lw="$AG/bin/l1_watcher.py"
  if [ -e "$lw" ]; then
    python3 -m py_compile "$lw" 2>/dev/null && ok "l1_watcher.py 语法 OK" || no "l1_watcher.py 语法错误"
    ok "l1_watcher.py 第三方依赖: 无（纯标准库）"
  else wr "l1_watcher.py 未安装"; fi
  [ -e "$AG/STEEL-WILL-KEYS.md" ] && ok "密钥汇总表在位" || wr "密钥汇总表缺失"
}

# ================= 5. 安装 =================
pm_install(){ # $@ = 包名
  [ $# -eq 0 ] && return 0
  case "$PM" in
    apt) $SUDO apt-get update -qq 2>/dev/null; $SUDO apt-get install -y -qq "$@" ;;
    dnf) $SUDO dnf install -y "$@" ;;
    yum) $SUDO yum install -y "$@" ;;
    apk) $SUDO apk add --no-cache "$@" ;;
    pacman) $SUDO pacman -Sy --noconfirm "$@" ;;
    zypper) $SUDO zypper -n install "$@" ;;
    *) return 1 ;;
  esac
}
pip_install(){ # Debian12/Ubuntu23+ 有 externally-managed-environment，逐级降级
  local host; host="$(echo "$PIP_SRC" | sed -E 's#https?://([^/]+)/.*#\1#')"
  python3 -m pip install --user --index-url "$PIP_SRC" --trusted-host "$host" "$@" 2>/dev/null && return 0
  python3 -m pip install --user --break-system-packages --index-url "$PIP_SRC" --trusted-host "$host" "$@" 2>/dev/null && return 0
  python3 -m pip install --user --break-system-packages -i "$PIP_SRC" "$@" 2>/dev/null && return 0
  return 1
}

install_all(){
  [ -z "$PM" ] && { wr "未识别的包管理器，请手工安装：${CMDS_REQUIRED}"; }
  resolve_mirrors
  hd "1/5 系统包"
  local miss=""
  for k in python3 pip venv curl wget git cacert unzip tar gzip jq rsync cc tzdata; do
    local pn; pn="$(pkgname "$k")"; [ -z "$pn" ] && continue
    case "$k" in
      python3) command -v python3 >/dev/null || miss="$miss $pn";;
      pip) python3 -m pip --version >/dev/null 2>&1 || miss="$miss $pn";;
      venv) python3 -c "import venv" >/dev/null 2>&1 || miss="$miss $pn";;
      curl) command -v curl >/dev/null || miss="$miss $pn";;
      wget) command -v wget >/dev/null || miss="$miss $pn";;
      git) command -v git >/dev/null || miss="$miss $pn";;
      cacert) [ -e /etc/ssl/certs/ca-certificates.crt ] || [ -e /etc/pki/tls/certs/ca-bundle.crt ] || miss="$miss $pn";;
      unzip) command -v unzip >/dev/null || miss="$miss $pn";;
      tar) command -v tar >/dev/null || miss="$miss $pn";;
      gzip) command -v gzip >/dev/null || miss="$miss $pn";;
      jq) command -v jq >/dev/null || miss="$miss $pn";;
      rsync) command -v rsync >/dev/null || miss="$miss $pn";;
      cc) command -v cc >/dev/null || command -v gcc >/dev/null || miss="$miss $pn";;
      tzdata) [ -e /usr/share/zoneinfo ] || miss="$miss $pn";;
    esac
  done
  if [ -n "$miss" ]; then
    echo "  待装:$miss"
    pm_install $miss && ok "系统包安装完成" || no "系统包安装失败（可换镜像源后重试）"
  else ok "系统包齐全"; fi

  hd "2/5 Node 运行时"
  if command -v node >/dev/null 2>&1; then ok "node $(node -v)"
  else
    local PN="${XDG_DATA_HOME:-$HOME/.local/share}/pi-node/current/bin"
    if [ -x "$PN/node" ]; then export PATH="$PN:$PATH"; ok "启用 pi 托管 node $(node -v)"
    else
      wr "本机无 node；pi 安装器通常会自带。若需独立安装，可用镜像："
      echo "    ${M_NODE_CN1}/<版本>/node-v<版本>-linux-${ARCH}.tar.xz"
    fi
  fi

  hd "3/5 Python 包"
  local need_pip=""
  for p in $PIP_OPT; do python3 -c "import importlib.util,sys;sys.exit(0 if importlib.util.find_spec('$p') else 1)" 2>/dev/null || need_pip="$need_pip $p"; done
  if [ "$WITH_OPT" = 1 ]; then
    for p in $PIP_SKILLS; do python3 -c "import importlib.util,sys;sys.exit(0 if importlib.util.find_spec('$p') else 1)" 2>/dev/null || need_pip="$need_pip $p"; done
  fi
  if [ -n "$need_pip" ]; then
    echo "  待装:$need_pip  （源: $PIP_SRC）"
    pip_install $need_pip && ok "Python 包安装完成" || wr "部分 Python 包装失败，可换镜像源重试"
  else ok "Python 包齐全（核心本来就无需任何 pip 包）"; fi

  hd "4/5 Node 包（~/.pi/agent）"
  local AG="${PI_HOME:-$HOME/.pi}/agent"; mkdir -p "$AG"
  [ -e "$AG/package.json" ] || { [ -e "$SRC/config/package.json" ] && cp -f "$SRC/config/package.json" "$AG/"; }
  if command -v npm >/dev/null 2>&1; then
    ( cd "$AG" && npm install --registry="$NPM_SRC" --no-audit --no-fund ) && ok "npm 依赖安装完成（源: $NPM_SRC）" || no "npm install 失败"
  else wr "无 npm，跳过"; fi

  hd "5/5 可选二进制（$([ "$WITH_OPT" = 1 ] && echo 已开启 || echo 未开启，加 --with-optional 启用)）"
  if [ "$WITH_OPT" = 1 ]; then
    command -v npm >/dev/null 2>&1 && npm i -g --registry="$NPM_SRC" $NPM_OPT_G && ok "@ast-grep/cli / lean-ctx-bin 已装" || wr "npm 全局包安装失败"
    pip_install scrapling yt-dlp && ok "scrapling / yt-dlp 已装" || wr "pip 包安装失败"
    [ -n "${GH_PROXY:-}" ] && wr "rtk / lightpanda 可经加速下载：$(gh_url "$BIN_RTK")" || wr "rtk / lightpanda 需从 GitHub release 下载"
  else
    printf "  ${D}（这些只为额外技能服务，框架核心不需要）${N}\n"
  fi
}

apply_global(){
  resolve_mirrors
  hd "写入全局镜像配置"
  mkdir -p "$HOME/.config/pip"
  cat > "$HOME/.config/pip/pip.conf" <<EOF
[global]
index-url = $PIP_SRC
trusted-host = $(echo "$PIP_SRC" | sed -E 's#https?://([^/]+)/.*#\1#')
EOF
  ok "pip -> $HOME/.config/pip/pip.conf"
  if command -v npm >/dev/null 2>&1; then npm config set registry "$NPM_SRC" && ok "npm -> registry=$NPM_SRC"; fi
  wr "apt 源未自动改写（风险高）。如需，请手工参考：${APT_CN:-$M_APT_CN1}"
}

case "$PMODE" in
  scan) scan ;;
  install) install_all; echo; scan ;;
  mirrors) resolve_mirrors; [ "$APPLY_GLOBAL" = 1 ] && apply_global ;;
  *) echo "用法: bash deps.sh {scan|install|mirrors} [--with-optional] [--apply-global]" ;;
esac
