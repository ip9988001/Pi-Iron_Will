# 钢铁意志 · PI 版 —— 卸载 Windows 计划任务
$ErrorActionPreference = "Continue"
foreach ($t in @("SteelWill-L1Watcher", "SteelWill-L1Refine")) {
  schtasks /End /TN $t 2>&1 | Out-Null
  schtasks /Delete /F /TN $t 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host "[OK] 已删除 $t" -ForegroundColor Green }
  else { Write-Host "[!] $t 不存在或删除失败" -ForegroundColor Yellow }
}
