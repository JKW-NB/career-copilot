# Career Copilot — 渐进式知识树

Career Copilot 同时是产品和学习软件工程、架构设计、AI Engineering 的主线。本文件按知识之间的关系组织，不按 Task 排列，也不充当开发日志。项目进度仍记录在 [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)。

## 1. 使用方式

知识状态只允许由学习过程推进：`未学习`、`学习中`、`已讲解，待确认`、`JKai 已确认`、`待复习`。代码已经存在不等于 JKai 已经理解，Agent 不得自动填写“我的理解”。

每次只展开当前 Task 必需的节点：讲解前保留最小目录；讨论和实操后，再将知识正文、Career Copilot 实例、设计取舍及 JKai 自评补回同一节点。默认深度是能理解并解释项目为什么这样设计；核心架构概念逐步达到能比较方案。除非影响当前理解，不主动深入 SQLite B-Tree、React Fiber、Rust 所有权底层、Transformer 数学、微服务、CQRS 或复杂 Agent Framework。

```text
Career Copilot
├─ 1. 软件整体如何组织
├─ 2. 数据如何可靠保存
├─ 3. 数据为什么需要历史
├─ 4. 信息从哪里来
├─ 5. AI 如何安全进入业务系统
├─ 6. AI 功能如何设计
├─ 7. Retrieval / RAG
├─ 8. Workflow / State Machine / Agent
├─ 9. Multi-objective Decision / Marginal Value
├─ 10. Grounding / Constrained Generation
└─ 11. Testing / Reliability / Privacy
```

## 2. 知识树

### 1. 软件整体如何组织

| 知识节点 | 状态 | 为什么 Career Copilot 需要 | 需要掌握的子概念 |
| --- | --- | --- | --- |
| Frontend | 学习中（M0-T1） | 承载用户看到和操作的工作区，但不能拥有数据库与核心业务规则 | UI、交互状态、事件、展示层边界 |
| └─ React | 学习中（M0-T1） | 将复杂页面拆成可组合组件，并让界面随状态更新 | Component、Props、State、Hook、渲染 |
| └─ TypeScript | 学习中（M0-T1） | 明确前端数据和函数合同，尽早发现类型错误 | Type、Interface、Union、编译期检查 |
| Desktop Application | 学习中（M0-T1） | 产品需要本地文件、SQLite 和系统凭据等浏览器无法安全直接提供的能力 | 原生进程、WebView、应用生命周期、系统能力 |
| └─ Tauri | 学习中（M0-T1） | 用 Rust 提供可信桌面边界，同时复用 React 界面 | Rust Core、WebView、Command、Capability |
| Module | 学习中（M0-T1） | 把界面、业务、AI、存储拆成职责清楚的部分 | 职责、依赖方向、封装、组合 |
| Interface / Contract | 学习中（M0-T1） | 让模块通过明确输入输出协作，避免彼此依赖内部细节 | API、类型合同、调用边界、错误合同 |
| Application Service | 未学习 | 将 UI 意图转换成受业务规则约束的用例 | Use Case、命令、校验、事务边界 |
| Build Toolchain | 学习中（M0-T1） | 把 TypeScript、React 和 Rust 组合成可运行、可分发的桌面程序 | npm、Vite、Cargo、lockfile、build/dev |

### 2. 数据如何可靠保存

| 知识节点 | 状态 | 为什么以后可能需要 | 需要掌握的子概念 |
| --- | --- | --- | --- |
| Data Model | 未学习 | 把经历、贡献、事实和证据变成稳定结构 | Entity、Attribute、Relationship、Constraint |
| Relational Database / SQLite | 未学习 | 本地保存结构化职业数据并支持可靠查询 | Table、Row、SQL、CRUD、Index 基础 |
| Primary Key / Foreign Key | 未学习 | 保证对象身份和关联有效 | 唯一标识、引用完整性、1:N、N:M |
| Transaction | 未学习 | 一次业务操作修改多条数据时不能只成功一半 | Atomicity、Commit、Rollback |
| Migration | 未学习 | 新版程序必须安全升级旧数据库 | Schema Version、顺序迁移、回滚、升级前备份 |
| File Storage | 未学习 | PDF、DOCX 和证据文件不适合直接存入 SQLite BLOB | 文件目录、元数据、阶段写入、恢复 |

### 3. 数据为什么需要历史

| 知识节点 | 状态 | 为什么以后可能需要 | 需要掌握的子概念 |
| --- | --- | --- | --- |
| Revision | 未学习 | 事实变化时保留旧表达及引用关系 | 追加写、current pointer、supersede |
| Snapshot | 未学习 | 冻结某次分析、组合或简历使用的完整状态 | 快照边界、引用集合、时间点一致性 |
| Immutable History | 未学习 | 已确认内容和真实投递不能被后续编辑改写 | 不可变对象、归档、历史保护 |
| Version Lineage | 未学习 | 说明 Master、岗位版本和最终文件如何演化 | parent、version number、branch、comparison |

### 4. 信息从哪里来

| 知识节点 | 状态 | 为什么以后可能需要 | 需要掌握的子概念 |
| --- | --- | --- | --- |
| Evidence | 未学习 | 区分材料中存在的依据与用户或 AI 的主张 | 原始材料、版本、片段、验证状态 |
| Provenance | 未学习 | 让简历表达可以追溯到事实和证据 | 来源链、审计、claim trace |
| Source Reference | 未学习 | 精确指出某个事实来自哪份材料的哪个位置 | source ID、snippet、locator |
| Hash | 未学习 | 识别文件内容、重复项和导出完整性 | SHA-256、内容身份、校验；不等同加密 |

### 5. AI 如何安全进入业务系统

| 知识节点 | 状态 | 为什么以后可能需要 | 需要掌握的子概念 |
| --- | --- | --- | --- |
| Structured Output | 未学习 | 将模型自由文本变成程序可检查的数据 | JSON、字段约束、解析失败 |
| JSON Schema | 未学习 | 用机器可执行规则描述 AI 输出形状 | required、enum、nested object、strictness |
| Schema Validation | 未学习 | 拒绝缺字段、错类型和非法枚举 | syntax/shape validation、error path |
| Business Rule Validation | 未学习 | JSON 合法仍不代表事实、ID、状态和权限合法 | invariant、authorization、semantic rule |
| Draft → Validate → Commit | 未学习 | AI 只能提出建议，用户和确定性代码决定是否写入 | draft isolation、review、commit、rejection |

### 6. AI 功能如何设计

| 知识节点 | 状态 | 为什么以后可能需要 | 需要掌握的子概念 |
| --- | --- | --- | --- |
| Prompt Contract | 未学习 | 固定模型任务、上下文、允许动作和输出格式 | Task、Context、Allowed/Forbidden、Output Schema |
| Context Engineering | 未学习 | 给模型足够且相关的信息，避免混入无关历史 | context selection、ordering、budget |
| Minimum Necessary Context | 未学习 | 降低隐私暴露、成本和无关信息干扰 | relevance、redaction、retention |
| Retry / Recovery | 未学习 | 模型超时或输出非法时不能损坏已提交数据 | bounded retry、idempotency、failure state |
| Confidence vs Verification | 未学习 | 模型自信程度不能替代证据或用户确认 | probability signal、evidence、verified state |

### 7. Retrieval / RAG

| 知识节点 | 状态 | 为什么以后可能需要 | 需要掌握的子概念 |
| --- | --- | --- | --- |
| Retrieval | 未学习 | 从大量职业资产中选出当前任务真正相关的内容 | filtering、ranking、query、recall/precision |
| RAG | 未学习 | 当简单结构化查询不足时，把检索结果作为模型上下文 | chunk、embedding、vector search、grounded answer |

### 8. Workflow / State Machine / Agent

| 知识节点 | 状态 | 为什么以后可能需要 | 需要掌握的子概念 |
| --- | --- | --- | --- |
| Workflow | 未学习 | 导入、访谈、分析和投递都由多个有顺序的步骤组成 | step、input/output、pause/resume、failure |
| State Machine | 未学习 | 限制对象只能发生合法状态变化 | state、transition、guard、terminal state |
| Agent | 未学习 | 只有需要模型自主选择多步工具时才评估引入 | planning、tool use、loop、stop condition |

### 9. Multi-objective Decision / Marginal Value

| 知识节点 | 状态 | 为什么以后可能需要 | 需要掌握的子概念 |
| --- | --- | --- | --- |
| Multi-objective Decision | 未学习 | 贡献组合需同时考虑覆盖、证据、影响、差异化和篇幅 | objective、constraint、trade-off、Pareto 基础 |
| Marginal Value | 未学习 | 一个强项目加入已有组合后未必仍提供新价值 | incremental gain、redundancy、coverage |

### 10. Grounding / Constrained Generation

| 知识节点 | 状态 | 为什么以后可能需要 | 需要掌握的子概念 |
| --- | --- | --- | --- |
| Grounding | 未学习 | 简历内容必须有允许使用的事实依据 | source-bound claim、citation chain、unsupported claim |
| Constrained Generation | 未学习 | 限制模型只能改写和组合已授权事实 | allowed facts、forbidden mutation、omission over invention |

### 11. Testing / Reliability / Privacy

| 知识节点 | 状态 | 为什么 Career Copilot 需要 | 需要掌握的子概念 |
| --- | --- | --- | --- |
| Testing Layers | 学习中（M0-T1） | 分别验证小规则、模块组合、浏览器流程和真实桌面运行 | unit、integration、E2E、desktop smoke |
| Reliability | 未学习 | 失败不能损坏职业事实、历史版本或最终文件 | failure mode、recovery、idempotency、observability |
| Privacy | 未学习 | 简历、经历材料和 API Key 都是敏感数据 | local-first、minimum retention、credential storage、deletion |

## 3. 知识节点的渐进填写模板

```text
## 知识名称

状态：未学习

为什么 Career Copilot 需要：
一句与当前产品有关的理由。

需要掌握：
- 子概念

知识正文：
待真正学到这里时补充。

Career Copilot 实例：
待实操或阅读已有实现后补充。

设计取舍与替代方案：
待讨论或实操后补充。

我的理解：
待 JKai 自己确认。
```

## 4. 当前学习范围：M0-T1

本轮只学习 M0-T1，不进入 M0-T2。知识层级是：

```text
可运行的桌面应用
├─ 界面层
│  ├─ Frontend
│  ├─ React
│  └─ TypeScript
├─ 桌面容器
│  ├─ Desktop Application
│  └─ Tauri：Rust Core + WebView + Capability
├─ 组织边界
│  ├─ Module
│  └─ Interface / Contract
├─ 构建链路
│  ├─ npm / Vite
│  └─ Cargo / lockfile
└─ 验证层次
   ├─ unit / typecheck / build
   ├─ browser E2E
   └─ native desktop smoke
```

当前学习材料：`src/main.tsx`、`src/app/`、`src/domain/`、`src/application/demo-service.ts`、`src-tauri/src/main.rs`、`src-tauri/src/lib.rs`、`src-tauri/tauri.conf.json`、`src-tauri/capabilities/default.json`、`package.json`、`Cargo.toml` 与 `tests/desktop/smoke.mjs`。

当前状态：正在进行 M0-T1 第一轮讲解，JKai 尚未确认理解。讲解结束后停止并讨论；不得自动进入 M0-T2 学习或 M0-T3 实现。
