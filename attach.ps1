# ============================================================
#  钢铁意志 · PI 版 —— Windows 原生接入脚本
#  等价于 Linux 上的 attach.sh，9 步全自动；不需要 WSL，也不需要 Git Bash。
#
#  用法（PowerShell 中执行）:
#    powershell -ExecutionPolicy Bypass -File attach.ps1
#    powershell -ExecutionPolicy Bypass -File attach.ps1 -Yes
# ============================================================
param(
  [switch]$Yes,
  [switch]$WithOptional
)
$ErrorActionPreference = "Continue"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
$SRC = Split-Path -Parent $MyInvocation.MyCommand.Path
$HOME_DIR = $env:USERPROFILE
if ($env:PI_HOME) { $PI_HOME = $env:PI_HOME } else { $PI_HOME = Join-Path $HOME_DIR ".pi" }
$AG = Join-Path $PI_HOME "agent"
$NPM_GLOBAL = Join-Path $env:APPDATA "npm"

function Say($m){ Write-Host "`n==> $m" -ForegroundColor Green }
function Ok($m){ Write-Host "[OK] $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[!] $m" -ForegroundColor Yellow }
function Err($m){ Write-Host "[x] $m" -ForegroundColor Red }

# ---- 工具函数 ----
function Copy-Tree($srcDir, $dstDir) {
  if (-not (Test-Path $srcDir)) { return 0 }
  New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
  $n = 0
  Get-ChildItem -LiteralPath $srcDir -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($srcDir.Length).TrimStart("\", "/")
    $dst = Join-Path $dstDir $rel
    $dstParent = Split-Path -Parent $dst
    if ($dstParent -and -not (Test-Path $dstParent)) { New-Item -ItemType Directory -Force -Path $dstParent | Out-Null }
    if (-not (Test-Path $dst)) { Copy-Item -LiteralPath $_.FullName -Destination $dst -Force; $n++ }
  }
  return $n
}

function Get-Python {
  foreach ($n in @("python", "pythonw", "py")) {
    $c = Get-Command $n -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
  }
  return $null
}

# ---- 路径归位：模板里写死的作者机器路径 → 本机实际路径 ----
$AG_FWD = $AG -replace '\\', '/'
$HOME_FWD = $HOME_DIR -replace '\\', '/'
function Fix-Text([string]$path) {
  if (-not (Test-Path $path)) { return }
  try {
    $c = Get-Content -LiteralPath $path -Raw -Encoding UTF8
    if (-not $c) { return }
    $o = $c
    $c = $c.Replace('/root/.pi/agent', $AG_FWD)
    $c = $c.Replace('/root/.local', ($HOME_FWD + '/.local'))
    $c = $c.Replace('C:\Users\35881\.pi\agent', $AG)
    $c = $c.Replace('C:\Users\35881\AppData\Roaming\npm', $NPM_GLOBAL)
    $c = $c.Replace('C:\Users\35881', $HOME_DIR)
    if ($c -ne $o) { Set-Content -LiteralPath $path -Value $c -Encoding UTF8 }
  } catch { }
}
function Fix-Tree([string]$dir) {
  if (-not (Test-Path $dir)) { return }
  Get-ChildItem -LiteralPath $dir -Recurse -File |
    Where-Object { @(".md", ".json", ".sh", ".py", ".ps1", ".ts", ".txt", ".mjs", ".service", ".timer") -contains $_.Extension } |
    ForEach-Object { Fix-Text $_.FullName }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " 钢铁意志 · PI 版 —— Windows 原生接入" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  源码目录 : $SRC"
Write-Host "  安装目标 : $AG"

# ---------- 0. 前置检查 ----------
Say "0/9 前置检查"
$piCmd = Get-Command pi -ErrorAction SilentlyContinue
if (-not $piCmd) {
  Err "未找到 pi 底座。请先安装 pi-Agent："
  Write-Host "    npm install -g @earendil-works/pi-coding-agent" -ForegroundColor Cyan
  Write-Host "    官网 https://pi.dev   官方仓库 https://github.com/earendil-works/pi" -ForegroundColor Cyan
  Write-Host "    装完重开一个 PowerShell 窗口（让 PATH 生效），再运行本脚本。"
  exit 1
}
Ok "pi 底座: $($piCmd.Source)"
$PY = Get-Python
if ($PY) { Ok "Python: $PY" } else { Warn "未找到 Python —— 记忆提炼会不可用。装法: winget install Python.Python.3.12" }
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCmd) { Ok "npm: $($npmCmd.Source)" } else { Warn "未找到 npm —— 记忆类 npm 依赖会跳过" }

# ---------- 1. 依赖 ----------
Say "1/9 依赖检查"
if (-not $PY) { Warn "建议执行: winget install Python.Python.3.12（装完重开窗口再跑本脚本）" }
if (-not $npmCmd) { Warn "建议安装 Node.js: winget install OpenJS.NodeJS.LTS" }

# ---------- 2. 备份 ----------
Say "2/9 备份已有配置"
$BK = Join-Path $HOME_DIR ("agent-attach-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
$backed = 0
foreach ($f in @("AGENTS.md", "SYSTEM.md", "l1_watcher.config.json", "settings.json")) {
  $src = Join-Path $AG $f
  if (Test-Path $src) {
    New-Item -ItemType Directory -Force -Path $BK | Out-Null
    Copy-Item -LiteralPath $src -Destination $BK -Force
    $backed++
  }
}
if ($backed -gt 0) { Ok "已备份 $backed 个文件到 $BK" } else { Ok "无既有配置需备份" }

# ---------- 3. 安装框架文件 ----------
Say "3/9 安装框架文件（同名不覆盖）"
$extDir = Join-Path $AG "extensions"
$n1 = Copy-Tree (Join-Path $SRC "extensions") $extDir
$extCount = (Get-ChildItem -LiteralPath $extDir -Filter *.ts -ErrorAction SilentlyContinue).Count
Ok "扩展: $extCount 个在位（全量启用，本次新增 $n1）"
# 老机器迁移：历史遗留的 extensions-disabled 一并迁入
$oldDis = Join-Path $AG "extensions-disabled"
if (Test-Path $oldDis) {
  Get-ChildItem -LiteralPath $oldDis -Filter *.ts | ForEach-Object {
    $t = Join-Path $extDir $_.Name
    if (-not (Test-Path $t)) { Copy-Item -LiteralPath $_.FullName -Destination $t -Force }
  }
  Rename-Item -LiteralPath $oldDis -NewName ("extensions-disabled.migrated-" + (Get-Date -Format "yyyyMMdd-HHmmss")) -ErrorAction SilentlyContinue
  Ok "已迁移历史 extensions-disabled/ 到启用目录"
}
Copy-Tree (Join-Path $SRC "skills") (Join-Path $AG "PI-技能库") | Out-Null
$skillCount = (Get-ChildItem -LiteralPath (Join-Path $AG "PI-技能库") -Directory -ErrorAction SilentlyContinue).Count
Ok "技能库: $skillCount 个技能"
Copy-Tree (Join-Path $SRC "constitution\0-AGENTS") (Join-Path $AG "0-AGENTS") | Out-Null
foreach ($f in @("AGENTS.md", "SYSTEM.md")) {
  $d = Join-Path $AG $f
  $s = Join-Path $SRC ("constitution\" + $f)
  if ((-not (Test-Path $d)) -and (Test-Path $s)) { Copy-Item -LiteralPath $s -Destination $d -Force }
}
Ok "宪法与约束层已就位"
foreach ($sub in @("bin", "services", "scripts", "assets", "win")) {
  $d = Join-Path $AG $sub
  New-Item -ItemType Directory -Force -Path $d | Out-Null
  if ($sub -eq "win") { Copy-Tree (Join-Path $SRC "engine\win") $d | Out-Null }
  else { Copy-Tree (Join-Path $SRC ("engine\" + $sub)) $d | Out-Null }
}
Copy-Tree (Join-Path $SRC "engine\pi-extensions") (Join-Path $AG ".pi\extensions") | Out-Null
Ok "引擎层已就位（l1_watcher.py / recall.ps1 / 语义检索 / 脚本）"

Say "路径归位"
Fix-Tree $AG
Ok "路径归位完成（C:\Users\35881\... 与 /root/.pi/agent -> $AG）"

# ---------- 4. 记忆骨架 ----------
Say "4/9 建立记忆骨架"
foreach ($d in @("l1", "wiki", "wiki_candidates\pending", "agent", "candidates", "candidates\agent", "candidates\user",
                 "system", "goals", "stages", "reflections", "archive\protocols", "adjudication", "governance", "user",
                 "bundles", "sensory_cortex", "swarm_matrix")) {
  New-Item -ItemType Directory -Force -Path (Join-Path $AG "memory\$d") | Out-Null
}
foreach ($d in @("entities", "concepts", "sources", "synthesis")) {
  New-Item -ItemType Directory -Force -Path (Join-Path $AG "memory\wiki\$d") | Out-Null
}
$pn = 0
$protoSrc = Join-Path $SRC "constitution\protocols"
if (Test-Path $protoSrc) {
  Get-ChildItem -LiteralPath $protoSrc -Filter *.md | ForEach-Object {
    $d = Join-Path $AG ("memory\archive\protocols\" + $_.Name)
    if (-not (Test-Path $d)) { Copy-Item -LiteralPath $_.FullName -Destination $d -Force; $pn++ }
  }
}
$goalSrc = Join-Path $SRC "constitution\goals-template"
if (Test-Path $goalSrc) {
  Get-ChildItem -LiteralPath $goalSrc -Filter *.md | ForEach-Object {
    $d = Join-Path $AG ("memory\goals\" + $_.Name)
    if (-not (Test-Path $d)) { Copy-Item -LiteralPath $_.FullName -Destination $d -Force }
  }
}
Ok "记忆骨架就绪（补入 $pn 份协议文档）"
Fix-Tree (Join-Path $AG "memory\archive\protocols")

# ---------- 5. key ----------
Say "5/9 密钥与提炼线路"
$KMD = Join-Path $AG "STEEL-WILL-KEYS.md"
if (-not (Test-Path $KMD)) {
  $kSrc = Join-Path $SRC "config\STEEL-WILL-KEYS.example.md"
  if (Test-Path $kSrc) { Copy-Item -LiteralPath $kSrc -Destination $KMD -Force; Ok "密钥汇总表已创建: $KMD" }
} else { Ok "密钥汇总表已存在，保留原内容" }
if ((Test-Path $AG) -and (Test-Path (Join-Path $SRC "config\l1_watcher.config.example.json")) -and -not (Test-Path (Join-Path $AG "l1_watcher.config.json"))) {
  Copy-Item -LiteralPath (Join-Path $SRC "config\l1_watcher.config.example.json") -Destination (Join-Path $AG "l1_watcher.config.json") -Force
}
if ($PY -and (Test-Path (Join-Path $AG "bin\l1_watcher.py"))) {
  Write-Host "  正在从 pi 底座读取驱动模型 key ..."
  & $PY (Join-Path $AG "bin\l1_watcher.py") --sync-key 2>&1 | ForEach-Object { Write-Host "    $_" }
}

# ---------- 6. settings ----------
Say "6/9 注册 settings 与 MCP"
$sp = Join-Path $AG "settings.json"
$st = $null
if (Test-Path $sp) { try { $st = Get-Content -LiteralPath $sp -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $st = $null } }
if (-not $st) { $st = New-Object -TypeName psobject }
if (-not $st.defaultThinkingLevel) { $st | Add-Member -NotePropertyName defaultThinkingLevel -NotePropertyValue "high" -Force }
if (-not $st.packages) { $st | Add-Member -NotePropertyName packages -NotePropertyValue @() -Force }
$pk = @($st.packages)
foreach ($p in @("https://github.com/anthropics/skills", "https://github.com/badlogic/pi-skills", "npm:pi-mcp-adapter", "npm:pi-lean-ctx")) {
  if ($pk -notcontains $p) { $pk += $p }
}
$st.packages = $pk
if (-not $st.extensions) { $st | Add-Member -NotePropertyName extensions -NotePropertyValue @() -Force }
$ex = @($st.extensions)
$rtk = Join-Path $AG ".pi\extensions\rtk.ts"
if ((Test-Path $rtk) -and ($ex -notcontains $rtk)) { $ex += $rtk }
$st.extensions = $ex
$st | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $sp -Encoding UTF8
Ok "settings.json 已更新（packages / extensions）"
$mcpSrc = Join-Path $SRC "config\mcp-adapter.json"
if ((Test-Path $mcpSrc) -and -not (Test-Path (Join-Path $AG "mcp-adapter.json"))) {
  Copy-Item -LiteralPath $mcpSrc -Destination (Join-Path $AG "mcp-adapter.json") -Force
  Ok "mcp-adapter.json 已安装"
}

# ---------- 7. npm ----------
Say "7/9 补齐 npm 依赖"
$pkgDst = Join-Path $AG "package.json"
$pkgSrc = Join-Path $SRC "config\package.json"
if ((-not (Test-Path $pkgDst)) -and (Test-Path $pkgSrc)) { Copy-Item -LiteralPath $pkgSrc -Destination $pkgDst -Force }
if ($npmCmd) {
  Push-Location $AG
  npm install --no-audit --no-fund 2>&1 | Select-Object -Last 3 | ForEach-Object { Write-Host "    $_" }
  Pop-Location
  foreach ($p in @("@xenova/transformers", "vectra")) {
    if (Test-Path (Join-Path $AG ("node_modules\" + $p))) { Ok "  $p 已装" } else { Warn "  $p 缺失" }
  }
} else { Warn "无 npm，跳过" }

# ---------- 8. 服务（计划任务替代 systemd）----------
Say "8/9 安装 Windows 计划任务（替代 systemd）"
$taskScript = Join-Path $AG "win\install-tasks.ps1"
if (-not (Test-Path $taskScript)) { Copy-Tree (Join-Path $SRC "engine\win") (Join-Path $AG "win") | Out-Null }
if (Test-Path $taskScript) {
  & powershell -ExecutionPolicy Bypass -File $taskScript -AgentDir $AG 2>&1 | ForEach-Object { Write-Host "    $_" }
} else { Warn "未找到 install-tasks.ps1，跳过服务安装" }

# ---------- 9. 验证 ----------
Say "9/9 验证"
Write-Host "  预热 pi 底座（首次运行会拉取技能包，可能较慢）..."
$null = & pi -p "回复两个字：就绪" 2>&1 | Out-String
if ($LASTEXITCODE -eq 0) { Ok "pi 底座可用（第四级兜底就位）" }
else { Warn "pi 底座预热失败 —— 请先跑一次 pi 完成登录/配置，再执行 l1_watcher.py --sync-key" }

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Windows 外接完成（无需 WSL）" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
$extN = (Get-ChildItem -LiteralPath (Join-Path $AG "extensions") -Filter *.ts -ErrorAction SilentlyContinue).Count
$skillN = (Get-ChildItem -LiteralPath (Join-Path $AG "PI-技能库") -Directory -ErrorAction SilentlyContinue).Count
$protoN = (Get-ChildItem -LiteralPath (Join-Path $AG "memory\archive\protocols") -Filter *.md -ErrorAction SilentlyContinue).Count
Write-Host "  扩展         : $extN 个（全量启用，无停用）"
Write-Host "  技能         : $skillN 个"
Write-Host "  约束层       : $(if (Test-Path (Join-Path $AG '0-AGENTS')) { 'OK' } else { '缺失' })"
Write-Host "  宪法         : $(if (Test-Path (Join-Path $AG 'AGENTS.md')) { 'OK' } else { '缺失' })"
Write-Host "  引擎         : $(if (Test-Path (Join-Path $AG 'bin\l1_watcher.py')) { 'OK' } else { '缺失' })"
Write-Host "  记忆骨架     : $(if (Test-Path (Join-Path $AG 'memory\wiki')) { 'OK' } else { '缺失' })"
Write-Host "  协议文档     : $protoN 份"
Write-Host "  密钥汇总表   : $(if (Test-Path $KMD) { 'OK' } else { '缺失' })"
$tk = ""
schtasks /Query /TN SteelWill-L1Watcher > $null 2>&1
if ($LASTEXITCODE -eq 0) { $tk = "SteelWill-L1Watcher 已注册" } else { $tk = "未注册" }
Write-Host "  计划任务     : $tk"
Write-Host ""
Write-Host "  · 会话采集已常驻（计划任务 SteelWill-L1Watcher，登录自动拉起）"
Write-Host "  · 记忆提炼每日 04:00 自动跑（SteelWill-L1Refine）"
Write-Host "  · 零 key 也能跑：四级容灾链最后一级直连 pi 底座驱动模型"
Write-Host "  · 查看任务: schtasks /Query /TN SteelWill-L1Watcher /V /FO LIST"
Write-Host "    卸载任务: powershell -File `"$AG\win\uninstall-tasks.ps1`""
Write-Host "  详细说明见 KEYS.md / DEPENDENCIES.md / README.md"
