# M0-T2 — Storage 与工作区位置

## 当前个人工作区（2026-10-26）

工作区已迁移到 D:\\CareerCopilotData\\workspace；原 C:\\Users\\HUAWEI\\AppData\\Local\\com.careercopilot.desktop\\workspace 是指向该位置的 Junction。设置页可能仍显示原路径，实际读写发生在 D 盘。原迁移备份暂留 C 盘。

新版本使用 Schema V3。首次打开旧工作区会先一致性备份再顺序迁移：0002 保存职业资产、事实修订、岗位、确认组合、Ready、Final 元数据和投递；0003 增加最小 AI 提案状态。API Key 位于 Windows 系统凭据，不随 app.db 复制；迁移设备后需要重新配置。原内存 Demo 与个人数据库隔离。下文 M0-T2 记录说明默认机制，不代表当前数据库只有基础元数据。

进程可设置 CAREER_COPILOT_WORKSPACE 为绝对目录，用于显式工作区选择；未设置时遵循原 Tauri 应用数据目录。正式迁移应关闭应用并保留完整工作区，当前仍未提供跨设备导出/导入界面。

## 三种不同的位置

1. **源代码仓库**：当前机器位于 `D:\DevTools\Codex\.chatgpt-projects\g-p-6a3bb234f6688191bcc82f1b494967b0\career-copilot`。它是独立 Git 仓库，可以复制或克隆到其他目录开发；该 Codex 项目目录不应是唯一备份。
2. **桌面程序**：构建产物与安装位置不保存用户职业数据。程序可在兼容的 Windows 设备重新构建或安装，但它不是浏览器插件。
3. **用户工作区**：由 Tauri 的 `app_local_data_dir` 决定，并追加独立的 `workspace/` 子目录。Windows 当前实际路径是 `C:\Users\HUAWEI\AppData\Local\com.careercopilot.desktop\workspace`。

设置页通过受信任的 `get_storage_info` 命令显示运行设备上的真实路径，不在前端猜测用户名或系统目录。浏览器 Demo 明确显示不创建本地工作区。

## 工作区结构

```text
workspace/
├─ app.db
├─ evidence/
├─ final-resumes/
└─ temp/
```

`app.db` 保存结构化数据与文件元数据；PDF、DOCX 等内容放文件目录，不存为数据库 BLOB。`temp/` 保存未完成的阶段文件和迁移前数据库备份。Tauri 自身的 `EBWebView` 缓存位于工作区外，不进入未来的数据迁移范围。

首次启动创建一个 32 位十六进制 `workspace_id`。同一工作区重启后 ID 不变，可用来识别数据库没有被悄悄换掉。每个数据库连接启用外键约束和 WAL；Migration 按 `PRAGMA user_version` 顺序执行，单次失败自动回滚。已有数据库升级前通过 SQLite Online Backup API 写入 `.backup` 文件。

文件落盘使用阶段写入：先在 `temp/` 创建不可覆盖的 `.pending` 文件并同步，再移动到受管目录。路径组件只允许字母、数字、`-` 和 `_`，不能通过 `../` 逃出工作区。提交失败时 pending 文件保留，下一次启动执行恢复清理。

## 可迁移性边界

当前版本可以移动源代码，也可以在其他机器安装程序；**用户工作区还不能像插件一样自动跟随**。直接复制正在运行的 `app.db` 可能遗漏 WAL 或未完成文件，因此不作为正式迁移方式。

若要实现“拿到另一台设备继续使用”，需要后续明确加入受控 Export/Import：关闭写入、执行一致性检查和 checkpoint、复制数据库及受管文件、生成 manifest/hash，并在目标设备校验后导入。云同步、自动漫游和便携模式仍不在当前 MVP 范围，本 Task 不暗中扩展。

## 验证

- Rust Storage 合同：重启身份保持、目录初始化、外键拒绝、Migration 回滚、升级前备份、文件失败恢复、启动恢复、路径越界拒绝。
- 前端边界：浏览器不调用桌面 Storage；桌面只通过 `get_storage_info` 获取路径和状态。
- 真实桌面：构建版连续启动两轮，确认 `app.db` 存在且 `workspace_id` 不变。

依赖选择：`rusqlite 0.40.2` 使用 bundled SQLite，避免依赖用户机器预装 SQLite；backup feature 用于一致性迁移备份。实现依据为 [Tauri PathResolver](https://docs.rs/tauri/latest/tauri/path/struct.PathResolver.html)、[Tauri Calling Rust](https://v2.tauri.app/develop/calling-rust/)、[rusqlite](https://docs.rs/rusqlite/0.40.2/rusqlite/) 与 [rusqlite Backup](https://docs.rs/rusqlite/0.40.2/rusqlite/backup/struct.Backup.html) 官方文档。
