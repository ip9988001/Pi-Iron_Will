# ============================================================
#  钢铁意志 · PI 版 —— Windows 计划任务安装（替代 Linux 的 systemd）
#  注册两个任务：
#    SteelWill-L1Watcher  登录后常驻，会话采集（无窗口运行）
#    SteelWill-L1Refine   每日 04:00 跑一次记忆精炼
#  用法: powershell -ExecutionPolicy Bypass -File install-tasks.ps1
#        powershell ... -File install-tasks.ps1 -AgentDir "D:\x\.pi\agent" -Time 05:30
# ============================================================
param(
  [string]$AgentDir = (Join-Path $env:USERPROFILE ".pi\agent"),
  [string]$Time = "04:00"
)
$ErrorActionPreference = "Continue"

function Ok($m){ Write-Host "[OK] $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[!] $m" -ForegroundColor Yellow }
function Err($m){ Write-Host "[x] $m" -ForegroundColor Red }

$bin = Join-Path $AgentDir "bin"
$watcher = Join-Path $bin "l1_watcher.py"
if (-not (Test-Path $watcher)) { Err "找不到 $watcher —— 请先跑 attach.ps1 / attach.sh"; exit 1 }

# --- 找解释器：优先 pythonw（无窗口），退回 python ---
$py = $null
foreach ($n in @("pythonw", "python", "py")) {
  $c = Get-Command $n -ErrorAction SilentlyContinue
  if ($c) { $py = $c.Source; break }
}
if (-not $py) { Err "找不到 python / pythonw —— 请先安装 Python 3 并勾选 Add to PATH"; exit 1 }
Ok "Python 解释器: $py"

$logDir = Join-Path $AgentDir "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$outLog = Join-Path $logDir "l1-watcher.out.log"
$errLog = Join-Path $logDir "l1-watcher.err.log"

# --- 1) 常驻采集任务（登录触发，等价 systemd 的常驻服务）---
$cmdLine = '"{0}" "{1}"' -f $py, $watcher
schtasks /Create /F /TN "SteelWill-L1Watcher" /TR $cmdLine /SC ONLOGON /RL LIMITED 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Ok "已注册 SteelWill-L1Watcher（登录后常驻，无窗口）" }
else { Warn "SteelWill-L1Watcher 注册失败（退出码 $LASTEXITCODE），可手工执行: $cmdLine" }

# --- 2) 每日精炼任务（等价 systemd timer）---
$refineCmd = '"{0}" "{1}" --refine-only' -f $py, $watcher
schtasks /Create /F /TN "SteelWill-L1Refine" /TR $refineCmd /SC DAILY /ST $Time /RL LIMITED 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Ok "已注册 SteelWill-L1Refine（每日 $Time 精炼）" }
else { Warn "SteelWill-L1Refine 注册失败（退出码 $LASTEXITCODE），可手工执行: $refineCmd" }

# --- 3) 立即拉起常驻采集（不等下次登录）---
schtasks /Run /TN "SteelWill-L1Watcher" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Ok "已立即启动 l1-watcher" } else { Warn "立即启动失败，重新登录后会自动跑" }

Write-Host ""
Write-Host "查看状态: schtasks /Query /TN SteelWill-L1Watcher /V /FO LIST"
Write-Host "停止    : schtasks /End /TN SteelWill-L1Watcher"
Write-Host "卸载    : powershell -ExecutionPolicy Bypass -File `"$(Join-Path $PSScriptRoot 'uninstall-tasks.ps1')`""
