# Career Copilot — Learning Map V1

这不是需要提前学完的课程表。Career Copilot 是主线：开发到一个 Task 时，只学习足够理解该 Task 的概念；完成后再用真实代码和测试复盘。本文不改变 [产品范围](PRODUCT_SPEC.md)、[技术合同](TECH_SPEC.md)或[任务顺序](IMPLEMENTATION_PLAN.md)。

## 1. 学习与记录规则

理解层级：L1 能解释术语；L2 能说明项目为什么需要它并看懂实现；L3 能比较方案、风险和取舍。默认先到 L2，模块边界、数据模型、Revision/Snapshot、AI 与确定性代码边界、Validation、Provenance 逐步到 L3。

项目状态与个人理解分开记录：`[ ]` 尚未在项目落地，`[~]` 当前 Task 正在落地，`[x]` 已有代码/测试证据。`[x]` 只证明项目使用过该概念，不证明 JKai 已掌握；理解层级由 JKai 自评或通过复述与方案比较确认。

每个 Task 严格按三段执行：

1. **先讲解**：只读了解现状后，Agent 在任何修改前向 JKai 简单介绍映射概念、为什么需要、将在哪里落地及目标层级，不展开无关底层原理。
2. **再实操**：编写测试、实现最小改动并完成验证。除非涉及产品或架构决策，不把课前说明变成额外审批关卡；JKai 可随时追问或打断。
3. **后复盘并写入**：Agent 向 JKai 说明代码与测试落点及关键取舍，并将可核验记录追加到本文“Task 复盘记录”。没有通过验收时记录阻塞，不标完成。

每个知识点最终回答五件事：它是什么；项目为什么需要；当前目标层级；落在什么代码/测试；是否有真实实现证据。

## 2. 知识地图

| ID | 知识点 | Career Copilot 为什么需要 | 目标 | 项目状态与证据 | 理解 |
| --- | --- | --- | --- | --- | --- |
| F1 | Frontend / Application / Storage 边界 | UI、业务规则和持久化需要独立演进，UI 不能直写数据库 | L3 | [x] `src/app/`、`src/application/demo-service.ts`、TECH 架构边界 | 待自评 |
| F2 | Tauri 桌面模型 | React 负责界面，Tauri 提供可信桌面容器与本地能力边界 | L2 | [x] `src-tauri/`、原生窗口 smoke | 待自评 |
| F3 | React 组件与状态 | 页面、Tab、侧栏和确认流程需要可组合的交互状态 | L2 | [x] `src/app/`、Vitest 与 Playwright 流程 | 待自评 |
| F4 | TypeScript 数据契约 | 模块间对象、枚举和结果需要在编译期明确 | L2 | [x] `src/domain/types.ts`、`npm run typecheck` | 待自评 |
| F5 | 测试层次 | 小规则、模块组合和真实用户流程需要不同粒度的证据 | L2 | [x] 文档/单元/浏览器/桌面 smoke | 待自评 |
| S1 | SQLite 与 CRUD | Career Truth、版本和投递记录必须跨重启保存 | L2 | [ ] M0-T2 | 待自评 |
| S2 | Primary / Foreign Key | 保证 Fact、Contribution、Evidence 等归属与引用有效 | L2 | [ ] M0-T2/M1 | 待自评 |
| S3 | Migration | 新版本软件必须安全升级旧数据库 | L2 | [ ] M0-T2 | 待自评 |
| S4 | Transaction / Atomicity | 多步写入失败时不能留下半套业务状态 | L3 | [ ] M0-T2 起 | 待自评 |
| S5 | File metadata / Hash / Recovery | 文件内容在文件系统，数据库保存路径、hash 与状态；双写失败可恢复 | L2 | [ ] M0-T2/M1-T3/M7 | 待自评 |
| S6 | Secure credential storage | API Key 不能进入数据库、源码、日志或普通前端状态 | L2 | [ ] M0-T4 | 待自评 |
| D1 | Entity / Relationship / 1:N / N:M | 将现实经历建成 Experience → Project → Contribution → Fact | L3 | [ ] M1 | 待自评 |
| D2 | Revision / Snapshot | 事实变化与某时刻的完整决策是两种不同版本问题 | L3 | [ ] M1-T2 起 | 待自评 |
| D3 | Immutable history | 已确认内容和真实投递不能随当前数据更新而变化 | L3 | [ ] M1/M5/M6/M7 | 待自评 |
| D4 | Provenance | Resume Claim 必须追溯到 Fact Revision、Contribution 与 Evidence | L3 | [ ] M1-T4/M6 | 待自评 |
| D5 | Archive / safe refactor | 删除、移动、合并资产不能破坏历史引用链 | L3 | [ ] M1-T1/T6 | 待自评 |
| A1 | Structured Output / JSON Schema | 模型输出必须先成为可校验的数据结构 | L3 | [ ] M0-T4/M2 | 待自评 |
| A2 | Schema vs Business Validation | JSON 合法不代表 ID、状态、权限和事实准入合法 | L3 | [ ] M0-T3/T4/M2 | 待自评 |
| A3 | Draft → Validate → Commit | AI 只能提案，确定性代码负责约束后提交 | L3 | [x] Demo Proposal 已示范；正式实现待 M0-T3/T4/M2 | 待自评 |
| A4 | Retry / Idempotency / Recovery | AI、导入或文件失败不能损坏已确认数据或重复写入 | L2 | [ ] M0-T4/M2/M8 | 待自评 |
| A5 | State machine | Interview、Import、Analysis 等流程需要合法状态迁移 | L2 | [ ] M2/M3/M4 | 待自评 |
| A6 | Truth / Derived Data / Confidence | AI 推断能力与用户事实分离，confidence 不等于 verified | L3 | [ ] M2/M3 | 待自评 |
| A7 | Prompt Contract | 每个 AI Task 固定 Task、Context、Allowed/Forbidden、Schema | L3 | [ ] M0-T4/M2-M6 | 待自评 |
| A8 | Context Engineering / Retrieval | 只给模型当前任务所需的最小、相关、可追溯上下文 | L3 | [ ] M0-T4/M4 | 待自评 |
| A9 | Explainability | 用事实和缺口解释判断，不输出无依据的总匹配分 | L3 | [x] Demo UI 已示范；正式数据待 M4 | 待自评 |
| P1 | Multi-objective decision | 组合需同时平衡覆盖、影响、证据、差异化、冗余和篇幅 | L2 | [ ] M5 | 待自评 |
| P2 | Marginal value / Coverage | 单项很强不等于加入当前组合仍有增量价值 | L3 | [ ] M5 | 待自评 |
| R1 | Constrained generation / Grounding | Resume 生成只能使用 Confirmed Portfolio 与 Allowed Facts | L3 | [ ] M6 | 待自评 |
| R2 | Diff / Local regeneration | 区分改文案与改事实，局部修改不应重生成整份内容 | L2 | [x] Demo 局部 Proposal 已示范；正式实现待 M6 | 待自评 |
| R3 | Version lineage / Historical record | Master、岗位版本和最终文件需要可比较的父子关系 | L3 | [ ] M6-T7/M7 | 待自评 |
| Q1 | Observability | 错误状态、日志和 AI run metadata 支撑诊断与恢复 | L2 | [ ] M0-T5/M8 | 待自评 |
| Q2 | Privacy / minimum retention | 个人材料、Prompt Context 和临时全文必须最小化留存 | L3 | [ ] M0-T4/M1-T3/M3/M8 | 待自评 |

## 3. Task → Learning 映射

本表是 Task 的 `Learning` 字段。`IMPLEMENTATION_PLAN.md` 继续只承载范围与验收，避免在两处重复维护概念说明。

| Task | 开工前重点 |
| --- | --- |
| M0-T1 | F1, F2, F3, F4, F5 |
| M0-T2 | S1, S2, S3, S4, S5, F1 |
| M0-T3 | F1, F4, A2, A3, S4 |
| M0-T4 | A1, A2, A3, A4, A7, A8, S6, Q2 |
| M0-T5 | F5, A4, Q1 |
| M1-T1 | D1, S2, D5, S4 |
| M1-T2 | D1, D2, D3, S2, S4, A6 |
| M1-T3 | S5, D2, D3, Q2, A4 |
| M1-T4 | D4, S2, D3 |
| M1-T5 | F1, D1, D4, A6 |
| M1-T6 | D5, D3, S2, S4 |
| M2-T1 | A4, A5, S4, S5 |
| M2-T2 | A1, A2, A3, A7, A8 |
| M2-T3 | A1, A2, A3, A4, D1 |
| M2-T4 | A1, A2, A3, A6, D4 |
| M2-T5 | A2, A3, A6, D2, D4 |
| M2-T6 | A4, A5, Q2, D1 |
| M3-T1 | A5, A7, A8, Q2 |
| M3-T2 | A1, A2, A3, A6, D4 |
| M3-T3 | D1, A6, S2 |
| M3-T4 | A6, A7, A8, A4 |
| M3-T5 | A6, A9, F3 |
| M4-T1 | D1, S5, Q2 |
| M4-T2 | A1, A2, A6, A7, A8, A9, D2 |
| M4-T3 | A9, F3, A6 |
| M4-T4 | A5, A7, A8, Q2 |
| M4-T5 | D2, D3, S5, A4 |
| M4-T6 | D1, D2, D3, A8 |
| M5-T1 | P1, P2, A7, A8, A9 |
| M5-T2 | D1, S2, D4, P2 |
| M5-T3 | D2, D4, A2, R1 |
| M5-T4 | P1, P2, D2, D3 |
| M5-T5 | P1, P2, A9, D3 |
| M5-T6 | S4, A2, A4, D2, D3 |
| M6-T1 | R1, D4, A1, A2, A7 |
| M6-T2 | F3, R1, P1, D4 |
| M6-T3 | R1, R2, D4, D2 |
| M6-T4 | R2, A2, A3, D4 |
| M6-T5 | R1, D4, A2 |
| M6-T6 | F3, Q2, D3 |
| M6-T7 | D2, D3, R3, S4 |
| M7-T1 | S5, S4, D3, A4 |
| M7-T2 | D1, S5, R3 |
| M7-T3 | D3, S4, S2, R3 |
| M7-T4 | D3, D5, S2, S4 |
| M7-T5 | D4, R3, F3 |
| M7-T6 | R3, D2, D3, D4 |
| M8-T1 | F5, A4, A5, Q2 |
| M8-T2 | F5, A2, D4, R1, P2 |
| M8-T3 | F5, S5, D3, R3 |
| M8-T4 | F5, A4, S4, Q1, Q2 |
| M8-T5 | F5, A1, A7, Q1 |
| M8-T6 | F5, Q1, Q2, F1 |

## 4. 当前学习入口：M0-T2

下一项不是泛学数据库，而是围绕一次真实持久化实现理解 S1–S5 与 F1：SQLite 保存什么；外键怎样保护关系；Migration 怎样升级旧库；Transaction 怎样避免半套数据；文件与数据库双写为什么需要恢复；UI 为什么只经受信任命令访问 Storage。

暂不展开 SQLite B-Tree、Rust 所有权细节、React Fiber、完整 RAG、Agent 框架或 Fine-tuning。只有简单筛选无法稳定检索上下文、单次受约束 AI Task 无法完成多步工具流程，或 Prompt/Context/Few-shot/Evaluation 在高质量数据上仍不稳定时，再分别评估 RAG、Agent 或 Fine-tuning。

## 5. Task 完成后的复盘模板

```text
Task:
涉及知识点：
代码与测试证据：
关键取舍：为什么采用当前方案？替代方案的代价是什么？
JKai 自评：L1 / L2 / L3 / 待复习
下一次需要补深的内容：
```

## 6. Task 复盘记录

复盘按 Task 追加，不重写历史。`JKai 自评` 默认“待自评”，只有 JKai 明确表达理解程度时才更新。

### M0-T1 — Desktop Application Shell（2026-09-08）

- 涉及知识点：F1、F2、F3、F4、F5。
- 代码与测试证据：`src-tauri/` 提供 Tauri 桌面容器和最小权限；`src/app/` 保持 React UI；`tests/desktop/smoke.mjs` 在构建版和开发版真实 WebView2 中各验证两轮启动、导航、AI 面板、关闭和重启。
- 关键取舍：复用已经过浏览器验收的 React Demo，由 Tauri 只承担桌面边界；没有在 M0-T1 提前加入 SQLite、文件插件或 AI Provider，避免桌面初始化与业务持久化耦合。
- 项目状态：已实现并通过验证。
- JKai 自评：待自评。
- 下一次需要补深：M0-T2 通过真实 Storage 命令理解 F1 与 S1–S5。
