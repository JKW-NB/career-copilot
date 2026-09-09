# Career Copilot — Agent Work Manual V1

适用 Codex / Claude Code / OpenCode 等 Coding Agent。本文压缩并补齐原对话工作手册；执行顺序见 [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)。

## 1. 开工顺序

1. 读取 [AGENTS.md](AGENTS.md)、[PRODUCT_SPEC.md](PRODUCT_SPEC.md)、[TECH_SPEC.md](TECH_SPEC.md)、本文件、[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)、[LEARNING_MAP.md](LEARNING_MAP.md) 与当前 Task 的真实代码。
2. 检查实际代码、Git 状态、前置 Task 与环境；不把规划中的目录/功能当作已存在。
3. 只领取一个 Task。先保持只读，识别知识层级，再用 Career Copilot 当前实例解释概念、必要性、不采用的后果、相近概念区别与代码落点。讲解结束后必须停止，等待 JKai 提问和讨论；只有 JKai 明确说“可以开始实现”后才能修改文件。
4. 文档与代码冲突先说明并提出最小修复方案，不自行大规模重构。重大产品功能、MVP 范围、隐私或核心架构调整需明确方案后确认；普通工程细节无需逐项询问。

## 2. 文档分工

PRODUCT_SPEC.md 决定用户行为和范围，TECH_SPEC.md 决定实现合同、枚举和存储关系，本文件决定开发纪律，IMPLEMENTATION_PLAN.md 决定任务顺序、验收和完成记录。四份文档共同采用 INV-01–08；修改涉及跨文档约束时同步更新引用处。

已检索的原对话为设计依据，不要求每次开发重读整段历史。原对话早期方案和后续冻结冲突时以较晚冻结为准；本次补齐的工程决策明确记录于 TECH_SPEC.md 和一致性检查。发现未解决冲突时不得暗中重新定义产品。

## 3. 八条红线

1. UI 不直接写数据库，业务动作经 Application Service 和受信任命令校验。
2. AI 不直接写正式业务数据，只提出 Draft。
3. 业务 AI 输出必须 Structured + Schema Validation + Business Rule Validation。
4. Career Truth 与 AI Derived Data 分离，confidence 不等于验证状态。
5. Confirmed / Historical Snapshot 不允许静默覆盖，包括子项与关联。
6. PDF、DOCX 等文件不存 SQLite BLOB，文件版本不覆盖。
7. API Key 不进 SQLite、明文配置、日志或源码，不从凭据库回传完整 Key 到 UI。
8. 优先当前 Task 与完整纵向闭环，不提前增加非 MVP 模块。

保持 Career / Job / Resume / AI / Storage 五个职责；不加云同步、多用户、微服务、Event Bus、CQRS、插件系统、复杂模型路由、Prompt 后台、无限画布或求职 CRM。

## 4. 必须保护的规则

- INV-01：不编造指标、规模和影响，不把团队成果升级为个人 Ownership；旧简历与口述不自动升级为 Evidence Verified。
- INV-02：Fact Revision / Evidence Version 保留历史；被引用结构只能安全归档/新建，不能破坏旧链。
- INV-03：确认与编译重新校验 Allowed Facts；未解决高风险 Planned Fact 阻塞，未选事实和真实 Gap 不连坐；UNCERTAIN 要先 Review。
- INV-04：Confirmed Portfolio、CONTENT_READY 内容及其引用不被重分析覆盖；新修改开新版本。
- INV-05：事实性 Resume Claim → Fact Revision → Contribution → Evidence / User Confirmation；语义一致性不能仅靠引用 ID 验证。
- INV-06：Application 固定绑定真实 Final PDF；已使用文件永久冻结，归档/VOIDED 不解冻。
- INV-07：AI 失败不损坏已提交数据，Draft/校验/事务分开，支持幂等重试和必要恢复。
- INV-08：最小上下文和留存；Extract & Forget 清理应用副本及全文缓存；访谈默认只留事实片段。

## 5. 每个 Task 的流程

1. **只读分析**：读取相关 Spec、知识树与当前实现，检查 Git 状态；禁止修改任何文件。
2. **知识识别**：确定当前 Task 真正需要的核心知识及层级关系，默认只达到“能理解并解释设计”的深度。
3. **课前讲解**：说明概念是什么、为什么项目需要、不采用会怎样、与相近概念的区别、当前代码对应哪里。
4. **强制停止**：讲解完成后结束当前轮次，等待 JKai 提问和讨论。没有“可以开始实现”的明确授权，不得写代码、改文档、生成迁移或提交。
5. **单 Task 实操**：获得授权后，先编写或更新能验证真实风险的测试，再实现最小改动；不得顺手推进下一 Task。
6. **验证**：运行相关测试、类型、编译、格式与真实应用检查，失败时修复后重跑。
7. **课后复盘**：说明知识落在哪些代码中、采用当前设计的原因、替代方案和 trade-off；把内容补回 LEARNING_MAP.md 的对应知识节点，不建立 Task 开发日志，也不代替 JKai 标记理解。
8. **提交并停止**：同步必要文档，为本 Task 创建 Git commit，报告验证与状态后停止。是否学习或实现下一 Task，只由 JKai 明确决定。

## 6. 测试重点与完成定义

优先测试不变量、状态拒绝与失败恢复，不追求覆盖率数字或模型逐字输出。必须覆盖：不可变 Revision、历史结构删除保护、高风险准入、快照隔离、USED 冻结、投递绑定、非法 AI 输出、事务失败/幂等、隐私清理。AI 合同用 fixture/mock，真实 Provider smoke 单独记录。

一个 Task 完成必须：符合 Spec；所有验收通过；相关测试及既有验证全通过；关键失败路径可恢复；无无关范围扩张；不破坏历史；受影响应用路径实际可用；文档与状态更新；已创建 commit。纯文档任务不要求不存在的 App 启动，但不得报告应用验证通过。

当前统一前端入口为 `npm run check`，Rust 入口为 `npm run check:rust`；桌面改动还需按 [桌面开发与验收说明](docs/DESKTOP_SETUP.md) 运行真实窗口 smoke，提交前执行 `git diff --check`。M0-T5 继续完善统一测试/错误框架。测试或检查失败先修复，不能为了提交而跳过检查。

浏览器 Demo 已增加 `npm run check`：文档测试、服务测试、类型检查、生产构建、Playwright 浏览器流程。AI 助手修改必须验证应用前不变、用户放弃、重复/过期应用拒绝、历史快照保留；新增描述始终标识为待审查草稿。岗位侧重点修改须验证重新确认与历史隔离；字号、资产新增、缺口弹窗及移动端布局要在真实浏览器验证。当前 AI 回复为离线演示，不宣称真实模型验证或桌面任务完成。

## 7. 交付格式

AI Side Panel 的交互验收须覆盖默认收起、打开不跳页且主页面可操作、收起保留会话、多目标选择、预览前无写入、确认后精准应用、拒绝/撤销、过期建议与后续修改保护。UI 改写复用事实边界，不能因增加应用按钮而绕过 INV-01–05。

简洁说明 Completed（完成内容）、Verification（实际检查与结果）、Changed（关键文件）、Remaining（未完成/阻塞）、Risks（已发现的范围外风险）及 commit。没有的项写 None，避免开发流水账；对 JKai 使用中文。
