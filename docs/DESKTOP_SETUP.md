# M0-T1 — 桌面开发与验收

现有 React 界面由 Tauri 原生窗口承载；浏览器预览入口继续保留。业务仍使用内存合成数据和离线 AI 回复，刷新或关闭应用会清除改动。SQLite 与重启恢复属于下一项 M0-T2。

## 环境与启动

本机：Windows x64、Node 24.11.1 / npm 11.6.2、Rust/Cargo 1.98.1、Visual Studio Build Tools 2022 17.14.39（C++ 桌面工作负载）、WebView2 152.0.4191.66。Rust 版本固定在 `rust-toolchain.toml`；npm 与 Cargo 锁文件均需提交。Tauri CLI 2.11.4、tauri 2.11.3、tauri-build 2.6.3 是此次实际选择的版本。

新机器先按 [Tauri 官方前置条件](https://v2.tauri.app/start/prerequisites/) 安装工具链，再执行 `npm ci`。Rust 安装后重新打开终端，使用户 PATH 中的 `%USERPROFILE%\.cargo\bin` 生效。当前已打开的 PowerShell 可执行：

```powershell
$env:Path = (Join-Path $env:USERPROFILE '.cargo/bin') + ';' + $env:Path
npm run tauri dev
```

桌面开发服务绑定 `127.0.0.1:1420`；关闭应用会结束 Tauri 开发进程。浏览器 Demo 使用 `npm run dev`，绑定 `127.0.0.1:5173`。端口被占用时明确报错，不自动换端口。Vite 忽略 Rust 构建目录，避免反复刷新。

## 验证命令

```powershell
npm run check
npm run check:rust
npm run tauri build -- --debug --no-bundle
npm run test:desktop
npm run test:desktop -- --dev
git diff --check
```

`check` 包含文档、服务、类型、生产前端构建和浏览器流程。当前无独立 lint 脚本。`check:rust` 使用锁文件执行 Cargo check/test；桌面壳暂不含 Rust 业务逻辑，Cargo test 不替代界面验证。

`test:desktop` 仅支持 Windows，通过临时的本地调试端口连接测试启动的真实 WebView2；检查 Tauri 宿主、基础导航、设置、AI 面板开关和简历演示流程，关闭后再启动，共两轮。`--dev` 通过同一 Tauri CLI 的 dev 入口启动，验证开发服务与原生窗口；不使用普通浏览器充当桌面。运行前关闭此仓库已有的桌面实例，避免实例目标歧义。截图保存在系统临时目录 `career-copilot-desktop-*.png`。

调试端口只在测试子进程环境中启用；应用配置不包含调试端口。主窗口只获得 Tauri core 默认权限，未加文件、Shell、HTTP、凭据插件。CSP 区分开发与构建环境，业务数据仍不对外发送。当前仅验证开发窗口及未打安装包的 debug 可执行程序，NSIS 安装包、签名、自动更新与跨平台发布不属于本次验收。

## 实际结果

- Node / npm、Rust / Cargo、Visual Studio C++ Build Tools、WebView2 已核验可用。
- `npm run check`：前端文档、服务、类型、生产构建和浏览器流程通过。
- `npm run check:rust`：Cargo check/test 通过；当前 Rust 壳无业务单元测试。
- `npm run tauri build -- --debug --no-bundle`：成功生成 `src-tauri/target/debug/career-copilot.exe`。
- `npm run test:desktop`：构建版真实 Tauri/WebView2 窗口连续两轮通过启动、导航、AI 面板、示例简历流程、关闭与再次启动。
- `npm run test:desktop -- --dev`：开发版真实 Tauri/WebView2 窗口连续两轮通过同一流程，验证 `npm run tauri dev` 链路。
