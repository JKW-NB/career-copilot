# 四份核心文档一致性检查

审查日期：2026-09-07。结论：规格基线可交给 Coding Agent 逐 Task 实施；M0-T1 尚未执行。此结论不代表程序、真实数据库、模型或桌面运行已验收。

## 1. 来源与取舍

依据 [完善简历管理产品文档](chatgpt-conversation://6a847cb0-6480-83e8-8538-0ed74de60598)，已读取包含产品定义、领域模型、收缩审计、Feature Spec 01–07、Schema、技术/AI 架构、工作手册与计划的连续 50 个近期回合。未将早期被替代方案当作现行要求，未把对话示例中的个人经历或指标作为演示数据。

| 冻结依据 | 原对话回合 ID（便于精确回读） | 落点 |
| --- | --- | --- |
| 产品定义、Workspace | 0ab5f445-72aa-48b7-a40c-1d16353d821a；003903a5-c3a9-4d54-a707-4b572c499a1f | PRODUCT_SPEC 第 1–2 节 |
| Domain Model 与收缩 | f1546c55-4e08-4128-96e4-89904f6c3bb2；3be2bbb8-f4fd-4ba1-b1e9-62db83e073a7 | 产品领域、技术模型与不扩展对象原则 |
| Feature 01–03 | d7e5af34-62da-4148-84c3-400db89d6b7a 至 6222f9ce-3d93-4d4e-aa43-d33f58b9bfe4 的相关冻结回合；80fd701c-edac-4b6e-a863-754eee4bb16b 访谈留存补充 | 产品第 4–6 节、M1–M3 |
| Feature 04–07 | 80fd701c-edac-4b6e-a863-754eee4bb16b；2bb7c5b9-af8d-463d-b97c-5ed8c2a992b0；f192f362-5745-446f-8eaa-d9074acd8945；51b6bcd1-5c10-42d4-86af-e40f19569835 | 产品第 7–10 节、M4–M7 |
| Database Schema V1 | 2439b8de-1499-4ae5-84a1-bb2e522a10ac | TECH_SPEC 字段速查，31 张表完整转录 |
| Technical / AI Architecture | ab3b6e24-958a-44c0-83b0-25ce4c1d96ef；ccc8d2da-5910-45eb-92cf-89b59f2a4cf4 | TECH_SPEC 架构、AI 合同、隐私及恢复 |
| 原工作手册、M0–M8 计划 | a0d4f8d1-d80b-4064-a126-087aa2c3c0ba | WORK_MANUAL 与 IMPLEMENTATION_PLAN，保留全部原 Task 编号 |

四文档负责不同问题，不重复抄整段原对话；字段速查保留完整原表，但 DDL 和具体包版本在实际任务核验。开发所需行为无需反复回读长对话。

## 2. Feature → Task 覆盖矩阵

| Feature | 主要任务 | 补充覆盖 |
| --- | --- | --- |
| 01 | M2-T1, M2-T2, M2-T3, M2-T4, M2-T5, M2-T6 | M1-T3 文件/隐私；M8-T1 冷启动恢复 |
| 02 | M1-T1, M1-T2, M1-T3, M1-T4, M1-T5, M1-T6 | M3-T3, M3-T4, M3-T5 能力；M7-T5 Usage |
| 03 | M3-T1, M3-T2 | M4-T4 岗位触发，M2-T5 风险审查 |
| 04 | M4-T1, M4-T2, M4-T3, M4-T4, M4-T5, M4-T6 | 方向母版输入、快照及无 Job scope 补齐 |
| 05 | M5-T1, M5-T2, M5-T3, M5-T4, M5-T5, M5-T6 | 母版差异、范围/风险校验、确认事务 |
| 06 | M6-T1, M6-T2, M6-T3, M6-T4, M6-T5, M6-T6, M6-T7 | Master 分支、额外事实授权、轻量教育/技能、局部更新 |
| 07 | M7-T1, M7-T2, M7-T3, M7-T4, M7-T5, M7-T6 | PDF 永久锁、Season、VOIDED、历史提示 |

## 3. 不变量 → 实现与验证矩阵

| 规则 | 实现任务 | 集成验证 |
| --- | --- | --- |
| INV-01 | M1-T2, M2-T4, M2-T5, M3-T2 | M8-T2 |
| INV-02 | M1-T2, M1-T3, M1-T4, M1-T6 | M8-T3 |
| INV-03 | M5-T3, M5-T6, M6-T1, M6-T4, M6-T7 | M8-T2 |
| INV-04 | M4-T5, M5-T6, M6-T7 | M8-T2 |
| INV-05 | M6-T1, M6-T3, M6-T4, M6-T5 | M8-T2 |
| INV-06 | M7-T1, M7-T3, M7-T4 | M8-T3 |
| INV-07 | M0-T4, M0-T5, M2-T1, M5-T6 | M8-T4 |
| INV-08 | M1-T3, M3-T1, M0-T4 | M8-T4 |

## 4. 已解决的不一致与遗漏

| 原始问题 | 当前合同与处理 |
| --- | --- |
| 早期 Fact 有 AI Inferred、DRAFT、CRITICAL | 采用后续 Schema：AI 为派生/运行 Draft，正式 Fact 三状态，风险 LOW/MEDIUM/HIGH |
| Capability Priority 与 Proof Priority 看似冲突 | 保留两个字段：CORE/DIFFERENTIATOR/SUPPORTING 与 CORE/IMPORTANT/SUPPORTING，不互相映射替换 |
| 最小领域对象数与表数不一致 | 领域概念与关联表不是同一计数；Schema 实际 31 表，完整保留，不新增独立 Profile/Gap/BulletVersion 等模型 |
| Master 已冻结，原 Schema 的 Analysis/Portfolio 必须有 Job | 技术第 5 节增加统一 scope 与方向输入快照；新增 M4-T6，无虚构岗位，无第二套表 |
| 原计划未明确搜索、Move/Merge/Split | 新增 M1-T6；Usage 从 M1 占位在 M7-T5 实装，未被遗忘 |
| Planned Facts 默认限制与主动换其他事实 | 额外可信 Revision 显式授权保存在内容工作版/快照，不修改 Confirmed Portfolio；换 Contribution 回上游 |
| Snapshot 只锁父记录不足 | 子项、关联、引用集合和显示上下文一并冻结；事实修改追加 Revision；不因当前标题变化改写历史 |
| Gap 可接受却 Analysis 不可覆盖 | Gap 决策/刷新产生新的分析版本，工作 Draft 显式重新绑定，不改被确认组合引用的 PR |
| Final 状态变 ARCHIVED 会掩盖 USED | first_used_at 永久锁及历史 Application 共同检查；VOIDED 不解除冻结；M7-T3 创建投递即保护 |
| 语义命名/Season 筛选缺少结构字段 | 内容/Final 补 season，Final 补 version_no，不解析显示名作为业务数据 |
| Evidence 删除副本后 extracted_text 仍可能存在 | 清理全文缓存、临时数据及运行输出中的全文；失败标待清理并重试，保留最小来源片段 |
| 早期“只对语义变化版本化”与历史 Revision 保护 | 实现采用提交后追加写；纠正文字/验证状态也新建 Revision，避免已存快照溯源变化，UI 不突出无关技术版本 |
| 五个 AI 任务族但七个 Prompt | Portfolio 与 Job 同族，Consistency 为辅助合同；未增加业务模块 |
| 重试可能在网络和修复层累计 | 一次逻辑调用共两次尝试，失败由用户手动重试，无 fallback 矩阵 |
| M0-T5 才出现测试框架 | M0-T1 即建立最小行为测试；M0-T5 完善框架。每次改动都测试并 commit，包括本轮文档 |

以上为本次明确的工程补齐，产品流程和 MVP 边界保持原设计。真实自然语言语义校验不能完全由 ID/schema 保证；不明确必须进入 Review，不能承诺模型零误判。

## 5. 验证方法与交接限制

本轮新增 `tests/docs.test.mjs`，用 Node 内置测试工具，无需安装依赖。运行 `node --test tests/docs.test.mjs` 检查四文档/AGENTS、七个 Feature、全部原任务及新增任务、31 表清单、INV 覆盖、合同枚举、Markdown 链接/围栏、M0-T1 待执行标记；反例验证缺少任务、错误映射、断链、遗漏不变量、未闭合围栏会失败。另运行 `git diff --check`。

语义一致性由逐项对照来源及上述两张矩阵审查；自动文档测试不证明产品实现正确。后续实际业务不变量测试分别在各 Task 编写，M8 集成验证，不将本轮文本检查冒充业务测试。

本轮实际文档测试结果：15 项通过、0 失败、0 跳过（Node v24.11.1）。最终提交前重跑同一命令并执行暂存区 whitespace 检查；提交本身及干净工作区由提交后检查确认。

M0-T1 开工前还需：定位/配置 Rust/Cargo，核验 C++ build tools、WebView2 与所选 Tauri 版本要求；固定依赖版本和锁文件；真正启动桌面窗口。当前环境只验证 Git/Node 可用，未执行应用或 Provider 验证。

## 6. 2026-09-08 Demo 交付补充

上节为文档基线当日记录。本次已有浏览器 Demo，实际验证范围与结果见 [FRONTEND_DEMO.md](FRONTEND_DEMO.md)，并非桌面或 Provider 验证。PRODUCT_SPEC 定义六项用户反馈和 AI Assistant 的显式应用行为；TECH_SPEC 定义 Proposal 旧值校验、原子应用、草稿隔离及 Requirement 快照；WORK_MANUAL 增加相应服务/浏览器回归要求；IMPLEMENTATION_PLAN 记录 DEMO-T1/T2 并保留 M0-T1 未完成。原 INV-01–08、31 表和 53 个正式 Task 不变，生产化沿用 Gateway、Career Review 与 Job Analysis 版本用例。未把离线问答、草稿记录或虚拟文件计为真实 AI、职业事实或投递。
