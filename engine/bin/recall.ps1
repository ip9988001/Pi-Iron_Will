# recall_memory 的 PowerShell 包装器（Windows 原生，无需 Git Bash）
# 用法: powershell -ExecutionPolicy Bypass -File recall.ps1 "搜索关键词" [top_k] [search_mode]
param(
  [Parameter(Position=0)][string]$Query,
  [Parameter(Position=1)][string]$TopK = "3",
  [Parameter(Position=2)][string]$Mode = "hybrid"
)
$ErrorActionPreference = "Continue"
if (-not $Query) { Write-Host '用法: powershell -File recall.ps1 "搜索关键词" [top_k] [search_mode]'; exit 1 }

$AG = if ($env:PI_HOME) { Join-Path $env:PI_HOME "agent" } else { Join-Path $env:USERPROFILE ".pi\agent" }
$env:RTK_DISABLED = "1"
Set-Location $AG -ErrorAction SilentlyContinue

$prompt = '请调用recall_memory工具，query参数为"' + $Query + '"，top_k为' + $TopK + '，search_mode为' + $Mode + '，直接返回结果不要解释'
& pi --print $prompt
