# Career Copilot

一个围绕真实职业事实组织求职材料的本地桌面工作台。

## 当前可以使用

- 添加职业资产，逐条录入与审查事实；修订生成新版本。
- 为岗位保存 JD 和能力要求，选择已确认事实并冻结组合。
- 生成简历内容快照，导出 Markdown 或可打印的 HTML 排版稿。
- 上传最终 PDF，以 SHA-256 校验文件；登记投递后永久冻结文件绑定。
- 查看历史简历和投递进度；关闭应用后数据仍在本机。
- 配置自己的兼容模型接口，使用右侧助手提问、分析岗位或建议改写事实；预览并确认后才应用。
- 在独立的合成 Demo 中演示 AI 侧栏和更完整的交互，不混入个人数据。

模型连接代码已交付，通过本机兼容 HTTP 接口和 Windows 凭据测试；尚未用用户的真实服务和密钥验证效果。材料批量解析、访谈、方向母版及自动组合优化尚未交付。简历编译仍只使用已确认事实原文，AI 改写应用后变为待审查修订。

## 启动

Windows 开发依赖见 [桌面说明](docs/DESKTOP_SETUP.md)。

~~~powershell
npm ci
npm run tauri -- dev
~~~

已构建版本位于 src-tauri/target/debug/career-copilot.exe。桌面默认打开真实工作区；侧栏可切换到演示。浏览器运行 npm run dev 默认打开原 Demo，/workspace 仅用于预览个人工作区，明确不在浏览器保存个人数据。

## 验证

~~~powershell
npm run check
npm run check:rust
npm run tauri -- build --debug --no-bundle
npm run test:desktop:workspace
npm run test:desktop:ai
npm run test:desktop
~~~

桌面个人流程测试使用隔离目录，连续启动两轮，不写入自己的求职材料。

## 使用自己的模型

打开桌面版“设置与数据”，填写兼容 Chat Completions 的基础地址（通常以 /v1 结尾）、默认/高质量模型 ID 和 API Key。密钥保存在 Windows 凭据管理器，不写入 SQLite。保存不会联网；可主动点击不含个人资料的连接测试。接口需要支持 JSON 输出模式。

侧栏底部打开 AI 助手，勾选要发送的事实或 JD，检查发送预览，再发送问题。普通回答直接显示；修改建议展示固定目标和预览，点击“应用修改”才保存。事实改写创建新的待审查版本，须重新审查才能用于新简历。关闭面板保留本次应用会话；重启不自动恢复完整对话。详见 [AI 连接与边界](docs/AI_CONNECTION.md)。

## 数据与边界

SQLite 保存结构化记录及快照，PDF 保存在独立受管目录。默认目录由 Tauri 决定，也可通过绝对路径环境变量 CAREER_COPILOT_WORKSPACE 指定。不要把个人数据、PDF、API Key 或测试工作区提交到 Git。

[交付计划与已知边界](docs/DELIVERY.md) · [作品集说明](docs/PORTFOLIO.md) · [产品规格](PRODUCT_SPEC.md) · [技术规格](TECH_SPEC.md)
