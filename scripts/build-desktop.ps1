# 构建紫微研习桌面版（Tauri 2 + 静态导出）
#
# 为什么要这个脚本：
#   1) 桌面版必须先做 Next 静态导出（NEXT_OUTPUT=export），网页版构建保持原样；
#   2) 本机没有 MSVC 链接器，Rust 走 GNU 工具链，需要把 C:\mingw64\bin 放进 PATH；
#   3) 两件事顺序固定，谁忘了谁就拿到一个白屏的 exe。
#
# 用法：powershell -ExecutionPolicy Bypass -File scripts\build-desktop.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

$env:PATH = "C:\mingw64\bin;$env:PATH"
$env:NEXT_OUTPUT = 'export'

Write-Host "1/2 静态导出前端产物 -> out\" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "前端静态导出失败，先修 Next 侧问题再打包" }

# 网页版不读这个变量，但后续 shell 里要清掉，免得误用
Write-Host "2/2 编译 Rust 壳并打 NSIS 安装包" -ForegroundColor Cyan
npx tauri build
if ($LASTEXITCODE -ne 0) { throw "Tauri 打包失败" }

Remove-Item Env:NEXT_OUTPUT -ErrorAction SilentlyContinue

$setup = Get-ChildItem -LiteralPath "$root\src-tauri\target\release\bundle\nsis" -Filter "*.exe" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($setup) {
    Write-Host "安装包：$($setup.FullName)" -ForegroundColor Green
} else {
    Write-Warning "没找到 NSIS 安装包，检查 src-tauri\target\release\bundle\nsis\"
}
