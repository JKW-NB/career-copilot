# Reactive Resume 文件互通

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

本阶段不包含远端 API 创建、自动 PDF 回传或双向同步。自动测试覆盖快照映射、草稿拒绝、特殊文字、版本文件名和真实桌面文件下载；真实 Reactive Resume 账户内的导入、中文模板排版及最终 PDF 视觉效果仍需实际验收，不把格式符合宣称为完整排版验收。

## 格式依据

- [Reactive Resume 导入说明](https://docs.rxresu.me/guides/importing-a-resume)
- [官方格式说明](https://docs.rxresu.me/guides/json-resume-schema)：区分原生格式与社区 JSON Resume。
- [JSON Resume 1.0.0 Schema](https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json)
- [Reactive Resume JSON Resume 导入器](https://github.com/reactive-resume/reactive-resume/blob/main/packages/import/src/json-resume.tsx)

适配模块：src/application/reactive-resume.ts。上游版本变化时先复核导入合同，再升级；不要把上游默认分支的长期兼容性当作保证。

本批验证通过：20 项文档检查、38 项单元测试、19 项浏览器流程、类型检查、生产构建、Windows 桌面构建及两轮真实桌面流程。合成下载样例见 [示例 JSON](../examples/reactive-resume.sample.json)，可直接用于试导入，不含真实个人资料。
