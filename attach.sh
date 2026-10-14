#!/usr/bin/env bash
# ============================================================
#  钢铁意志 · PI 版 —— 一行外接脚本
#  把整套外挂系统接到任意一台已装 pi 的机器上。
#
#  用法:
#    bash attach.sh                    # 交互式，会询问 key
#    bash attach.sh --yes              # 全自动，key 从环境变量取或跳过
#    GLM_API_KEY=xxx bash attach.sh    # 预先给 key
#    bash attach.sh --with-optional    # 连可选技能依赖一起装
# ============================================================
set -uo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
PI_HOME="${PI_HOME:-$HOME/.pi}"
AG="$PI_HOME/agent"
# 平台探测：linux / macos / windows(Git Bash / MSYS / Cygwin)
OS_KIND="linux"
case "$(uname -s 2>/dev/null)" in
  Darwin) OS_KIND="macos" ;;
  MINGW*|MSYS*|CYGWIN*) OS_KIND="windows" ;;
esac
NONINTERACTIVE=0; WITH_OPT=0
for a in "$@"; do case "$a" in --yes|-y) NONINTERACTIVE=1;; --with-optional) WITH_OPT=1;; esac; done

G='\033[1;32m'; Y='\033[1;33m'; R='\033[1;31m'; C='\033[1;36m'; N='\033[0m'
say(){ printf "\n${G}==> %s${N}\n" "$*"; }
warn(){ printf "${Y}[!] %s${N}\n" "$*"; }
err(){ printf "${R}[x] %s${N}\n" "$*"; }
ok(){ printf "${G}[✓]${N} %s\n" "$*"; }
need(){ command -v "$1" >/dev/null 2>&1; }
ask(){ # $1=提示 $2=变量名 $3=默认值
  local cur="${!2:-}"
  if [ -n "$cur" ]; then ok "$2 已由环境变量提供"; return 0; fi
  if [ "$NONINTERACTIVE" = "1" ]; then return 0; fi
  printf "${C}? %s${N}（直接回车 = 跳过，将自动降级到 pi 底座驱动模型）: " "$1"
  read -r ans || true
  [ -n "${ans:-}" ] && export "$2=$ans"
  return 0
}

# ---------- 0. 前置检查 ----------
say "0/9 前置检查"
if ! need pi; then
  err "未找到 pi。请先安装 pi-Agent 底座，再运行本脚本。"
  err "（pi 装好后 \$HOME/.pi/agent 会被创建，本脚本才能接入）"
  exit 1
fi
PI_VER="$(pi --version 2>/dev/null | head -1)"
ok "pi 底座: $PI_VER"
mkdir -p "$AG"
[ -z "${HOME:-}" ] && { err "HOME 未设置"; exit 1; }
PY=python3; need $PY && ok "python3: $($PY -V 2>&1)" || { err "缺 python3"; exit 1; }
if need node; then ok "node: $(node -v)"; else
  PN="${XDG_DATA_HOME:-$HOME/.local/share}/pi-node/current/bin"
  if [ -x "$PN/node" ]; then export PATH="$PN:$PATH"; ok "node（pi 自带）: $(node -v)"
  else warn "未找到 node，向量化/向量库将不可用"; fi
fi
# ---- 模型可用性预检：五级兜底至少需要一条线路，无模型则提前说清 ----
$PY - "$AG/settings.json" "$AG/auth.json" <<'PY'
import json,sys
try:
    st=json.load(open(sys.argv[1],encoding="utf-8"))
    prov=st.get("defaultProvider") or ""; model=st.get("defaultModel") or ""
except Exception:
    prov=model=""
keys=[]
try:
    au=json.load(open(sys.argv[2],encoding="utf-8"))
    keys=[p for p,e in au.items() if isinstance(e,dict) and (e.get("key") or e.get("apiKey"))]
except Exception:
    pass
if keys:
    print("\033[1;32m[\u2713]\033[0m pi 驱动模型: %s / %s（key 可用，第四级兜底就位）" % (prov or "?", model or "?"))
else:
    print("\033[1;33m[!] pi 底座尚未配置可用模型 —— 五级兜底会全部断线")
    print("    框架本体照样装好，但记忆提炼不会动。修法（任选其一，再重跑本脚本）：")
    print("      ① 运行 `pi` 完成一次登录/配置 provider（最省事）")
    print("      ② 编辑 %s 第二区，填 GLM 或 DeepSeek key" % sys.argv[1].replace("settings.json","STEEL-WILL-KEYS.md"))
    print("    配好后跑: python3 %s/bin/l1_watcher.py --sync-key" % sys.argv[1].rsplit("/",1)[0])
PY

# ---------- 1. 依赖扫描与自动安装 ----------
say "1/9 依赖扫描与自动安装"
if [ "$OS_KIND" = "windows" ]; then
  warn "检测到 Windows 环境（Git Bash / MSYS）"
  echo "    ★ 推荐改用 PowerShell 原生接入（功能完整，不需要 Git Bash）："
  echo "        powershell -ExecutionPolicy Bypass -File \"$SRC/attach.ps1\""
  echo "    本脚本会继续，但依赖只做检测、不改系统。缺什么用 winget 装："
  for t in python3 python node npm git; do
    command -v "$t" >/dev/null 2>&1 && ok "已装: $t" || warn "缺失: $t"
  done
  echo "       winget install Python.Python.3.12   /   winget install OpenJS.NodeJS.LTS   /   winget install Git.Git"
elif [ -f "$SRC/deps.sh" ]; then
  bash "$SRC/deps.sh" scan
  echo
  if [ "$WITH_OPT" = "1" ]; then bash "$SRC/deps.sh" install --with-optional
  else bash "$SRC/deps.sh" install; fi
else warn "未找到 deps.sh，跳过依赖安装"; fi

# ---------- 2. 备份已有配置 ----------
say "2/9 备份已有配置"
BK="$HOME/.pi/agent-attach-backup-$(date +%Y%m%d-%H%M%S)"
for f in AGENTS.md SYSTEM.md l1_watcher.config.json settings.json; do
  [ -e "$AG/$f" ] && { mkdir -p "$BK"; cp -a "$AG/$f" "$BK/" 2>/dev/null; }
done
[ -d "$BK" ] && ok "已备份到 $BK" || ok "无既有配置需备份"

# ---------- 2. 装框架文件 ----------
say "3/9 安装框架文件"
inst(){ # src dst —— 用 src/. 语义，避免目标已存在时把源目录嵌套进去
  [ -e "$1" ] || return 0
  mkdir -p "$2"
  cp -a "$1/." "$2/"
}
# 扩展：全量启用，默认不覆盖已有的同名文件（保护本机改动）
mkdir -p "$AG/extensions"
for f in "$SRC"/extensions/*.ts; do
  b="$(basename "$f")"; [ -e "$AG/extensions/$b" ] || cp -f "$f" "$AG/extensions/$b"
done
# 老机器迁移：历史遗留的 extensions-disabled/ 一并迁入启用目录（本版起不再有停用概念）
if [ -d "$AG/extensions-disabled" ]; then
  for f in "$AG"/extensions-disabled/*.ts; do
    [ -e "$f" ] || continue; b="$(basename "$f")"
    [ -e "$AG/extensions/$b" ] || cp -f "$f" "$AG/extensions/$b"
  done
  mv "$AG/extensions-disabled" "$AG/extensions-disabled.migrated-$(date +%Y%m%d-%H%M%S)" 2>/dev/null
fi
ok "扩展: 已确保 $(ls "$AG/extensions"/*.ts 2>/dev/null | wc -l) 个在位（全量启用）"
inst "$SRC/skills"              "$AG/PI-技能库"
ok "技能库: $(ls "$AG/PI-技能库" 2>/dev/null | wc -l) 个技能"
inst "$SRC/constitution/0-AGENTS" "$AG/0-AGENTS"
[ -e "$AG/AGENTS.md" ] || cp -f "$SRC/constitution/AGENTS.md" "$AG/AGENTS.md"
[ -e "$AG/SYSTEM.md" ] || cp -f "$SRC/constitution/SYSTEM.md" "$AG/SYSTEM.md"
ok "宪法与约束层已就位"
mkdir -p "$AG/bin" "$AG/services" "$AG/scripts" "$AG/assets" "$AG/win" "$AG/.pi/extensions"
cp -f "$SRC/engine/bin/"*       "$AG/bin/"       2>/dev/null
cp -f "$SRC/engine/services/"*  "$AG/services/"  2>/dev/null
cp -f "$SRC/engine/scripts/"*   "$AG/scripts/"   2>/dev/null
cp -f "$SRC/engine/pi-extensions/rtk.ts" "$AG/.pi/extensions/rtk.ts" 2>/dev/null
cp -f "$SRC/engine/aux/"*       "$AG/bin/"       2>/dev/null
cp -f "$SRC/engine/win/"*       "$AG/win/"       2>/dev/null
chmod +x "$AG/bin/"* 2>/dev/null
ok "引擎层已就位（l1_watcher.py / recall.sh / 语义检索 / 脚本）"

# 路径归位：模板里写死的是作者机器的 /root/.pi/agent，换成实际安装路径
fixpath(){
  [ -e "$1" ] || return 0
  sed -i "s|/root/\.local|$HOME/.local|g; s|/root/\.pi/agent|$AG|g" "$1" 2>/dev/null || true
}
# Windows（Git Bash）下模板里可能写的是 C:\Users\<名字>\...，用 python 做字面替换（不在 MSYS 里受反斜杠转义折磨）
fixwin(){
  [ "$OS_KIND" = "windows" ] || return 0
  [ -e "$1" ] || return 0
  local PY
  PY=$(command -v python || command -v python3) || return 0
  "$PY" - "$1" "$AG" "$HOME" <<'PYWIN' 2>/dev/null || true
import sys, io, os
p, ag, home = sys.argv[1], sys.argv[2], sys.argv[3]
try: s = io.open(p, encoding="utf-8", errors="ignore").read()
except Exception: sys.exit(0)
o = s
s = s.replace("/root/.pi/agent", ag.replace("\\", "/"))
s = s.replace("C:\\Users\\35881\\.pi\\agent", ag)
appdata = os.environ.get("APPDATA")
if appdata:
    s = s.replace("C:\\Users\\35881\\AppData\\Roaming\\npm", os.path.join(appdata, "npm"))
s = s.replace("C:\\Users\\35881", home)
if s != o:
    try: io.open(p, "w", encoding="utf-8", newline="").write(s)
    except Exception: pass
PYWIN
}
for f in "$AG"/bin/*.sh "$AG"/bin/*.py "$AG"/scripts/* "$AG"/0-AGENTS/*.md "$AG"/*.md "$AG"/win/*.ps1; do fixpath "$f"; fixwin "$f"; done
if [ -d "$AG/PI-技能库" ]; then
  find "$AG/PI-技能库" -type f \( -name "*.md" -o -name "*.sh" \) -print0 2>/dev/null | while IFS= read -r -d '' f; do fixpath "$f"; fixwin "$f"; done
fi
ok "路径归位完成（/root/.pi/agent → $AG）"

# ---------- 3. 记忆骨架（已存在则不碰） ----------
say "4/9 建立记忆骨架"
for d in l1 wiki wiki_candidates/pending agent candidates candidates/agent candidates/user \
         system goals stages reflections archive/protocols adjudication governance user \
         bundles sensory_cortex swarm_matrix; do
  mkdir -p "$AG/memory/$d"
done
[ -d "$AG/memory/wiki/entities" ] || mkdir -p "$AG/memory/wiki/"{"entities","concepts","sources","synthesis"}
# 协议文档：只补不覆盖（老机器上已被记忆进化改写的不动）
n=0
for f in "$SRC"/constitution/protocols/*.md; do
  [ -e "$f" ] || continue; b="$(basename "$f")"
  [ -e "$AG/memory/archive/protocols/$b" ] || { cp -f "$f" "$AG/memory/archive/protocols/$b"; n=$((n+1)); }
done
ok "记忆骨架就绪（补入 $n 份协议文档）"
for f in "$SRC"/constitution/goals-template/*.md; do
  [ -e "$f" ] || continue; b="$(basename "$f")"
  [ -e "$AG/memory/goals/$b" ] || cp -f "$f" "$AG/memory/goals/$b"
done
ok "目标定义模板就绪"

# ---------- 4. key 配置 ----------
say "5/9 配置 key（全部可跳过）"
echo "  提炼引擎支持四级容灾：GLM → DeepSeek → pi 底座驱动模型"
echo "  也就是说：两个 key 都不填，也能正常跑（自动用 pi 当前配置的模型兜底）"
ask "智谱 GLM API Key（提炼主模型，可跳过）" GLM_API_KEY
ask "DeepSeek API Key（二级兜底，可跳过）"   DEEPSEEK_API_KEY
CFG="$AG/l1_watcher.config.json"
if [ ! -e "$CFG" ]; then cp -f "$SRC/config/l1_watcher.config.example.json" "$CFG" 2>/dev/null; fi
$PY - "$CFG" <<'PY'
import json,sys,os
p=sys.argv[1]
try: d=json.load(open(p,encoding='utf-8'))
except Exception: d={}
d.setdefault("glm_base_url","https://open.bigmodel.cn/api/paas/v4")
d.setdefault("glm_model","glm-4.7")
d.setdefault("deepseek_base_url","https://api.deepseek.com/v1")
d.setdefault("deepseek_model","deepseek-chat")
d["glm_api_key"]=os.environ.get("GLM_API_KEY","") or d.get("glm_api_key","")
d["deepseek_api_key"]=os.environ.get("DEEPSEEK_API_KEY","") or d.get("deepseek_api_key","")
json.dump(d,open(p,'w',encoding='utf-8'),indent=2,ensure_ascii=False)
os.chmod(p,0o600)
g=bool(d["glm_api_key"]); s=bool(d["deepseek_api_key"])
print(f"[✓] 配置已写入 {p}（600）  GLM:{'已配' if g else '未配'}  DeepSeek:{'已配' if s else '未配'}")
print("    兜底链: " + ("GLM → DeepSeek → pi 底座" if g and s else ("GLM → pi 底座" if g else ("DeepSeek → pi 底座" if s else "pi 底座驱动模型（四级兜底，无需任何 key）"))))
PY

# ---- 密钥汇总表（钢铁意志唯一的密钥来源）----
KMD="$AG/STEEL-WILL-KEYS.md"
if [ ! -e "$KMD" ]; then
  cp -f "$SRC/config/STEEL-WILL-KEYS.example.md" "$KMD" 2>/dev/null
  ok "密钥汇总表已创建: $KMD"
else ok "密钥汇总表已存在，保留原内容"; fi
chmod 600 "$KMD" 2>/dev/null
echo "  密钥汇总表是第一顺位来源；第二区留空时，自动从 pi 底座抄驱动模型的 key 进来。"

# ---- 自动登记 pi 驱动模型的 key（框架自动给自己配兜底 key）----
if [ -e "$AG/bin/l1_watcher.py" ]; then
  echo "  正在从 pi 底座读取驱动模型 key ..."
  $PY "$AG/bin/l1_watcher.py" --sync-key 2>&1 | sed 's/^/    /'
fi

# ---------- 5. settings / MCP ----------
say "6/9 注册 settings 与 MCP"
export STEEL_AG="$AG"
$PY - "$AG/settings.json" "$SRC/config" <<'PY'
import json,sys,os
sp,cd=sys.argv[1],sys.argv[2]
try: s=json.load(open(sp,encoding='utf-8'))
except Exception: s={}
s.setdefault("defaultThinkingLevel","high")
pk=s.setdefault("packages",[])
for p in ["https://github.com/anthropics/skills","https://github.com/badlogic/pi-skills","npm:pi-mcp-adapter","npm:pi-lean-ctx"]:
    if p not in pk: pk.append(p)
ex=s.setdefault("extensions",[])
rtk=os.path.join(os.environ.get("STEEL_AG") or os.path.expanduser("~/.pi/agent"), ".pi/extensions/rtk.ts")
if os.path.exists(rtk) and rtk not in ex: ex.append(rtk)
json.dump(s,open(sp,'w',encoding='utf-8'),indent=2,ensure_ascii=False)
print("[✓] settings.json 已更新（packages / extensions）")
PY
if [ -e "$SRC/config/mcp-adapter.json" ] && [ ! -e "$AG/mcp-adapter.json" ]; then
  cp -f "$SRC/config/mcp-adapter.json" "$AG/mcp-adapter.json"; ok "mcp-adapter.json 已安装"
fi

# ---------- 6. npm 依赖 ----------
say "7/9 补齐 npm 依赖（deps.sh 已装则为空操作）"
[ -e "$AG/package.json" ] || cp -f "$SRC/config/package.json" "$AG/package.json" 2>/dev/null
if need npm; then
  ( cd "$AG" && npm install --no-audit --no-fund ) && ok "npm 依赖安装完成" || warn "npm install 失败，请手工在 $AG 执行"
  for p in "@xenova/transformers" "vectra"; do
    [ -d "$AG/node_modules/$p" ] && ok "  $p 已装" || warn "  $p 缺失"
  done
  echo "  （typebox / @earendil-works/pi-coding-agent / jiti 由 pi 底座自带，无需安装）"
else warn "无 npm，跳过"; fi

# ---------- 7. systemd ----------
say "8/9 安装服务与定时器"
SUDO=""; [ "$(id -u)" = "0" ] || SUDO="sudo"
if [ -d "/etc/systemd/system" ] && need systemctl; then
  $SUDO cp -f "$SRC/systemd/l1-watcher.service" "$SRC/systemd/l1-refine.service" "$SRC/systemd/l1-refine.timer" /etc/systemd/system/ 2>/dev/null
  $SUDO sed -i "s|/root/\.pi/agent|$AG|g; s|/usr/bin/python3|$(command -v python3 || echo /usr/bin/python3)|g" /etc/systemd/system/l1-watcher.service /etc/systemd/system/l1-refine.service 2>/dev/null
  $SUDO systemctl daemon-reload 2>/dev/null
  $SUDO systemctl enable --now l1-watcher 2>/dev/null && ok "l1-watcher 已启动（会话采集，常驻）" || warn "l1-watcher 启动失败"
  $SUDO systemctl enable --now l1-refine.timer 2>/dev/null && ok "l1-refine.timer 已启用（每日 04:00 记忆提炼）" || warn "l1-refine.timer 启用失败"
elif [ "$OS_KIND" = "windows" ]; then
  if [ -e "$AG/win/install-tasks.ps1" ] && command -v powershell >/dev/null 2>&1; then
    echo "  用 Windows 计划任务替代 systemd（登录常驻 + 每日精炼）..."
    powershell -ExecutionPolicy Bypass -File "$AG/win/install-tasks.ps1" -AgentDir "$AG" 2>&1 | sed 's/^/    /'
    powershell -ExecutionPolicy Bypass -File "$AG/win/install-tasks.ps1" -AgentDir "$AG" >/dev/null 2>&1 && ok "Windows 计划任务已安装" || warn "计划任务安装失败，可手工执行 $AG/win/install-tasks.ps1"
  else
    warn "未找到 powershell 或 install-tasks.ps1，跳过服务安装"
  fi
else warn "非 systemd 环境，跳过服务安装；可手工运行 $AG/bin/l1_watcher.py"; fi

# ---------- 8. 验证 ----------
say "9/9 验证（含 pi 底座预热）"
if [ "$NONINTERACTIVE" = "1" ] || true; then
  echo "  预热 pi 底座（首次运行会拉取技能包，可能较慢）..."
  if timeout 600 pi -p "回复两个字：就绪" >/dev/null 2>&1; then ok "pi 底座可用（第四级兜底就位）"
  else
    warn "pi 底座预热失败 —— 第四、五级兜底暂不可用（其余已全部装好）"
    echo "    点亮兜底链：先跑一次 \`pi\` 完成登录/配置，然后执行"
    echo "      python3 $AG/bin/l1_watcher.py --sync-key"
    echo "    或直接编辑 $AG/STEEL-WILL-KEYS.md 第二区填入 GLM / DeepSeek key"
  fi
fi
echo "  pi 底座      : $PI_VER"
echo "  扩展         : $(ls "$AG/extensions"/*.ts 2>/dev/null | wc -l) 个（全量启用，无停用）"
echo "  技能         : $(ls "$AG/PI-技能库" 2>/dev/null | wc -l) 个"
echo "  约束层       : $([ -d "$AG/0-AGENTS" ] && echo OK || echo 缺失)"
echo "  宪法         : $([ -e "$AG/AGENTS.md" ] && echo OK || echo 缺失)"
echo "  引擎         : $([ -e "$AG/bin/l1_watcher.py" ] && echo OK || echo 缺失)"
echo "  记忆骨架     : $([ -d "$AG/memory/wiki" ] && echo OK || echo 缺失)"
echo "  协议文档     : $(ls "$AG/memory/archive/protocols"/*.md 2>/dev/null | wc -l) 份"
echo "  key 配置     : $([ -e "$CFG" ] && echo OK || echo 缺失)"
keystate(){
  [ -e "$KMD" ] || { echo "缺失"; return; }
  local g s2 dr
  g=$(sed -n "s/^glm_api_key *= *//p" "$KMD" | head -1)
  s2=$(sed -n "s/^deepseek_api_key *= *//p" "$KMD" | head -1)
  dr=$(sed -n "s/^driver_api_key *= *//p" "$KMD" | head -1)
  printf "GLM:%s DeepSeek:%s 驱动模型key:%s" \
    "$([ -n "$g" ] && echo 已配 || echo 未配)" \
    "$([ -n "$s2" ] && echo 已配 || echo 未配)" \
    "$([ -n "$dr" ] && echo 已登记 || echo 未登记)"
}
echo "  密钥汇总表   : $([ -e "$KMD" ] && echo OK || echo 缺失)  $(keystate)"
if need systemctl; then echo "  服务         : l1-watcher=$(systemctl is-active l1-watcher 2>/dev/null) / l1-refine.timer=$(systemctl is-enabled l1-refine.timer 2>/dev/null)"; fi
echo
echo "  语法自检："
$PY -m py_compile "$AG/bin/l1_watcher.py" 2>/dev/null && echo "    [✓] l1_watcher.py 语法 OK" || echo "    [x] l1_watcher.py 语法错误"
echo "  提炼线路自测（会真实调用一次）："

$PY - "$AG/bin/l1_watcher.py" <<'PY'
import importlib.util,sys,time
try:
    spec=importlib.util.spec_from_file_location('lw',sys.argv[1])
    m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    t=time.time(); out=m.call_llm_refine([{"role":"user","content":"只回复四个字：兜底可用"}], max_tokens=64, temperature=0.1, label="自检", timeout=180)
    print(f"    [{'✓' if out.strip() else 'x'}] 提炼线路: {out.strip()[:40] or '无输出'}  ({time.time()-t:.1f}s)")
except Exception as e:
    print(f"    [x] 提炼线路自检异常: {type(e).__name__}: {e}")
PY

cat <<'DONE'

============================================================
 外接完成。
   · 会话采集已常驻（l1-watcher）
   · 记忆提炼每日 04:00 自动跑（l1-refine.timer），四级容灾
   · 没配任何 key 时：自动把 pi 驱动模型的 key 登记进密钥汇总表并用它直连
   · 连 pi 的 key 都不可用时，再降级为调用 pi 进程本身（pi -p）
   · 配置变更后：systemctl restart l1-watcher
 详细说明见 KEYS.md / DEPENDENCIES.md / README.md
============================================================
DONE
