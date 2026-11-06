# Reactive Resume 文件互通

## 桌面直连

保存后可点击“测试已保存的连接”。程序只查询简历列表以验证站点和读取权限，不发送当前简历。测试成功后，创建排版副本仍需写权限。

在“设置与数据 → Reactive Resume”填写站点地址与该实例的读写 API Key。官方托管地址是 https://rxresu.me，自托管可填写自己的站点根地址。本机 HTTP 仅允许回环地址，其他站点使用 HTTPS。密钥按工作区和站点保存在 Windows 凭据管理器，可从设置删除。

1. 在简历内容页确认版本就绪，点击“在 Reactive Resume 中排版”。核对发送目标和内容范围，确认后在浏览器打开排版副本。浏览器须登录对应账号。
2. 调整模板、字体和分页，并在编辑器预览 PDF。涉及数字、职责或成果的修改应回到职业资产修订并生成新内容版本。
3. 在 Career Copilot 中点击“取回 PDF 并归档”，复核并确认对应内容版本。程序下载 PDF 并沿用最终文件的完整性检查。投递登记仍由用户主动操作。

首次创建通过官方文件导入接口直接上传内存中的 JSON。关联以站点和本地内容版本为单位保存，重复打开复用同一远端文档。若请求超时或响应无法确认，查看远端是否已创建，再用下方文件路线完成交付，避免重复创建。编辑内容不会回写职业事实，PDF 归档由用户复核文字与版本。

运行 Windows 桌面构建后，可用 `npm run test:desktop:reactive-resume` 验证本机模拟接口的创建、复用、拒绝无效 PDF 和归档。真实账户和排版效果需要在所配置实例上验证。

## 手动文件路线

2026-11-05：第一阶段使用 Reactive Resume 支持的社区 JSON Resume 格式，不是它自身的六字段原生 JSON 格式。导出在本机完成，无需 API Key、不自动上传资料。

## 操作

1. 在求职工作区生成简历内容，并明确点击“确认内容就绪”。
2. 点击“导出到 Reactive Resume”，保存带内容 ID 和版本号的 JSON 文件。
3. 打开 Reactive Resume，在导入入口选择 JSON Resume 并上传该文件。
4. 选择模板，整理联系方式和教育背景，检查中文字体、标点、长段落与分页，导出 PDF。
5. 回 Career Copilot 的“最终文件”，选择原内容版本并登记 PDF。实际投递后登记投递记录。

联系方式与教育背景目前是自由文本，按原文放入摘要，避免猜测邮箱、学校、学位、起止年月。项目标题放在经历描述，机构与角色分列，同组事实作为 highlights。缺失日期省略。当前分组依据快照中的机构、项目标题与角色；现有快照没有独立贡献 ID，完全同名同角色会合并展示。导出不包含事实 ID、JD、证据、API Key 或整份职业数据库。

## 历史边界

只接受 CONTENT_READY 快照；不从当前资产重建已冻结内容。排版工具中的事实修改不会回写或自动被标记可信。修改数字、职责或成果后应回到 Career Copilot 创建事实修订和新内容版本，再导出。PDF 登记沿用现有文件摘要与永久冻结规则，不证明外部 PDF 文字与原快照语义完全一致。

文件路线的自动测试覆盖快照映射、草稿拒绝、特殊文字、版本文件名和真实桌面文件下载。真实账户内的导入、中文模板排版及 PDF 视觉效果仍需实际验收。

## 格式依据

- [Reactive Resume 导入说明](https://docs.rxresu.me/guides/importing-a-resume)
- [官方格式说明](https://docs.rxresu.me/guides/json-resume-schema)：区分原生格式与社区 JSON Resume。
- [JSON Resume 1.0.0 Schema](https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json)
- [Reactive Resume JSON Resume 导入器](https://github.com/reactive-resume/reactive-resume/blob/main/packages/import/src/json-resume.tsx)

适配模块：src/application/reactive-resume.ts。上游版本变化时先复核导入合同，再升级；不要把上游默认分支的长期兼容性当作保证。

本批验证通过：20 项文档检查、38 项单元测试、19 项浏览器流程、类型检查、生产构建、Windows 桌面构建及两轮真实桌面流程。合成下载样例见 [示例 JSON](../examples/reactive-resume.sample.json)，可直接用于试导入，不含真实个人资料。
