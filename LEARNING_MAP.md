# Career Copilot — 渐进式知识树

Career Copilot 同时是产品和学习软件工程、架构设计、AI Engineering 的主线。本文件按知识之间的关系组织，不按 Task 排列，也不充当开发日志。项目进度仍记录在 [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)。

## 1. 使用方式

知识状态只允许由学习过程推进：`未学习`、`学习中`、`已完成本轮学习`、`待复习`。`已完成本轮学习`只表示该 Task 当前深度的 Learning Parts 已通过，不表示永久掌握。代码已经存在不等于 JKai 已经理解，Agent 只能从 JKai 的真实回答中填写“我的当前理解”，不能代替 JKai 宣称掌握。

每次只展开当前 Task 必需的节点：讲解前保留最小目录；全部 Learning Parts 通过后先执行 Learning Map Sync，把知识正文、项目必要性、已确认理解和易混淆点补回原节点并停止；获得实操授权且实现验证完成后，再通过 Implementation Reflection 补充真实代码落点与设计取舍。Task 只触发更新，不成为本文件的组织主轴。默认深度是能理解并解释项目为什么这样设计；核心架构概念逐步达到能比较方案。除非影响当前理解，不主动深入 SQLite B-Tree、React Fiber、Rust 所有权底层、Transformer 数学、微服务、CQRS 或复杂 Agent Framework。

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
| Frontend | 已完成本轮学习 | 承载用户看到和操作的工作区，但不能拥有数据库与核心业务规则 | UI、交互状态、事件、展示层边界 |
| └─ React | 已完成本轮学习 | 将复杂页面拆成可组合组件，并让界面随状态更新 | Component、Props、State、Hook、渲染 |
| └─ TypeScript | 已完成本轮学习 | 明确前端数据和函数合同，尽早发现类型错误 | Type、Interface、Union、编译期检查 |
| Desktop Application | 已完成本轮学习 | 产品需要本地文件、SQLite 和系统凭据等浏览器无法安全直接提供的能力 | 原生进程、WebView、应用生命周期、系统能力 |
| └─ Tauri | 已完成本轮学习 | 提供桌面程序外壳和可信系统侧能力，同时复用 React 界面 | Rust Core、WebView、Command、Capability |
| └─ WebView | 已完成本轮学习 | 在桌面窗口中显示和运行网页界面 | 页面承载、桌面窗口、与浏览器的区别 |
| Module | 已完成本轮学习 | 把界面、业务、AI、存储拆成职责清楚的部分 | 职责、依赖方向、封装、组合 |
| Interface / Contract | 已完成本轮学习 | 让模块通过明确输入输出协作，避免彼此依赖内部细节 | API、类型合同、调用边界、错误合同 |
| Application Service | 未学习 | 将 UI 意图转换成受业务规则约束的用例 | Use Case、命令、校验、事务边界 |
| Build Toolchain | 已完成本轮学习 | 把 TypeScript、React 和 Rust 组合成可运行、可分发的桌面程序 | npm、Vite、Cargo、lockfile、build/dev |

#### Frontend

- **状态**：已完成本轮学习。
- **知识正文**：前端是用户直接看到和操作的软件部分，包括页面、文字、按钮、输入框、导航和操作后的界面变化。它负责收集意图与展示结果，不应直接拥有数据库和核心业务规则。
- **Career Copilot 为什么需要**：职业资产、岗位策略、贡献组合、简历编辑和 AI 侧栏都要通过一致的界面让用户理解并操作复杂流程。
- **我的当前理解**：JKai 能区分可见页面与 SQLite 数据库，知道数据库不属于前端。对“前端边界主要由职责决定，而不只是能否看见”仍待后续深化。
- **Career Copilot 实际落点**：`src/main.tsx` 挂载应用；`src/app/App.tsx` 组合主工作区；`src/app/` 下各页面和样式文件负责可见界面。
- **实际设计**：同一套前端既可在浏览器 Demo 中运行，也可放进 Tauri 桌面窗口，便于先验证交互再接入可信桌面能力。
- **易混淆点**：`用户看不见 = 一定不是前端` 只能作为初步判断；更可靠的判断是它是否负责用户交互和展示。

#### React

- **状态**：已完成本轮学习。
- **知识正文**：React 用组件组织界面，并根据当前状态重新计算应该显示什么。点击按钮常会改变状态，随后 React 更新对应界面；它也负责初次渲染，不只处理点击。
- **Career Copilot 为什么需要**：AI 面板开关、页面切换、弹窗、组合状态和简历内容都会随着操作变化，手工逐项改页面容易失控。
- **我的当前理解**：JKai 知道 React 属于前端，也抓住了“操作改变数据后，界面需要随之更新”的核心关系。React 与浏览器最终绘制像素的分工待后续深化。
- **Career Copilot 实际落点**：`src/main.tsx` 使用 `createRoot(...).render(...)` 启动 React；`src/app/App.tsx` 使用 `useState` 保存页面、弹窗和 AI 面板等状态；`src/app/Assistant.tsx` 等文件提供可组合页面组件。
- **实际设计**：M0-T1 复用现有 React Demo 作为桌面界面，交互状态仍在内存中，因此刷新或关闭会清除演示修改。
- **易混淆点**：`React 只负责点击后的屏幕变化` 过窄；React 还负责组件组织、首次渲染和其他状态变化后的界面更新。

#### TypeScript

- **状态**：已完成本轮学习。
- **知识正文**：TypeScript 在运行前检查代码约定的数据形状和可用操作，例如必填字段是否存在、值是否属于允许类型。它能发现形式矛盾，不能判断一段职业描述是否真实。
- **Career Copilot 为什么需要**：岗位、事实、简历内容和 AI 提案结构复杂，类型检查可以在运行前发现字段拼错、遗漏或错误组合。
- **我的当前理解**：JKai 能说明“不符合必须为文字等格式会被阻止”，并明确知道类型正确不等于事实真实。
- **Career Copilot 实际落点**：`tsconfig.json` 开启 `strict` 和 `noEmit`；`src/app/App.tsx` 的 `Page` 联合类型限制页面值；`src/application/demo-service.ts` 的接口定义界面与服务之间的数据合同。
- **实际设计**：`npm run typecheck` 只做静态检查，不生成产品文件，也不代替运行测试和事实校验。
- **易混淆点**：类型检查只证明数据形式与代码使用方式相容，不证明按钮可用、数据真实或业务规则正确。

#### Desktop Application、Tauri 与 WebView

- **状态**：三者均已完成本轮学习。
- **知识正文**：桌面应用是在电脑操作系统中安装或启动的软件。Tauri 把网页界面放进桌面程序，并提供连接本地文件、数据库等系统能力的可信外壳；WebView 是桌面窗口里承载网页界面的显示环境。
- **Career Copilot 为什么需要**：产品要使用本地 SQLite、证据文件和系统凭据，普通网页不能直接承担全部桌面能力。
- **我的当前理解**：JKai 能区分网页界面与连接电脑系统的桌面部分；把 Tauri 理解为让网页程序成为桌面程序的桥梁；知道 WebView 让 Career Copilot 在桌面中仍可按网页方式显示。
- **Career Copilot 实际落点**：`src-tauri/src/main.rs` 启动原生程序；`src-tauri/src/lib.rs` 构建 Tauri 应用；`src-tauri/tauri.conf.json` 连接开发页面或构建后的 `dist`；`src-tauri/capabilities/default.json` 只给主窗口核心默认权限。
- **实际设计**：采用 Tauri 复用 React 界面，并用 Rust 侧承接可信桌面能力。浏览器入口继续保留，便于快速开发和浏览器流程测试。
- **设计取舍**：只做浏览器应用会更简单，但无法满足本地文件、SQLite 和凭据等产品要求。M0-T1 未比较 Electron 等其他桌面框架，后续无需补造结论。
- **易混淆点**：Tauri 不是单纯“显示网页的镜子”；WebView 主要承载界面，Tauri 负责更完整的桌面应用外壳与系统连接。

#### Module

- **状态**：已完成本轮学习。
- **知识正文**：模块把一组相关职责放在一起，并通过明确入口与其他部分协作。拆分的目的包括降低误改范围，让一个功能变化不必触碰所有代码。
- **Career Copilot 为什么需要**：Career、Job、Resume、AI、Storage 的规则不同，混在一个文件中会让修改 AI 助手时更容易误伤岗位策略等功能。
- **我的当前理解**：JKai 能用“修改 Assistant 时不会误改 Strategy”说明模块隔离的价值。
- **Career Copilot 实际落点**：`src/app/Assistant.tsx`、`Strategy.tsx`、`Portfolio.tsx` 等按界面职责拆分；`src/application/demo-service.ts` 集中演示用操作，`src-tauri/src/storage/` 独立承担存储基础。
- **实际设计**：当前模块边界先保持轻量文件和目录，不提前加入插件系统或复杂分层框架。
- **易混淆点**：模块不保证绝对不会互相影响；它通过边界减少耦合，仍需接口和测试保护。

#### Interface / Contract

- **状态**：已完成本轮学习。
- **知识正文**：接口或合同规定两个部分协作时允许输入什么、必须返回什么，以及错误如何表达。调用方依赖合同，不应依赖另一模块的内部细节。
- **Career Copilot 为什么需要**：UI、服务、桌面命令和未来 AI 输出必须用稳定格式协作，否则字段遗漏会在更晚阶段产生难查错误。
- **我的当前理解**：JKai 能判断缺少规定必填的 `summary` 就违反合同并应被阻止，同时知道格式通过仍不能证明内容真实。
- **Career Copilot 实际落点**：`src/application/demo-service.ts` 定义页面可调用的服务方法和输入结构；TypeScript 类型与测试共同检查合同；`src-tauri/src/lib.rs` 暴露受信任命令入口。
- **实际设计**：M0-T1 的演示服务合同让 React 页面不必直接操作所有内部状态，为后续 Application Service 替换演示实现保留边界。
- **易混淆点**：合同验证解决“格式和允许操作”，事实真实性与业务合法性还需要其他规则验证。

#### Build Toolchain

- **状态**：已完成本轮学习。
- **知识正文**：开发模式用于快速修改和查看；生产构建把源代码检查并整理为可分发产物。npm 管理前端依赖并运行脚本，Vite 提供前端开发服务器和构建，Cargo 管理及构建 Rust/Tauri 部分，锁文件固定实际依赖版本。
- **Career Copilot 为什么需要**：项目同时包含 React/TypeScript 和 Rust/Tauri，两条构建链都通过才能形成可靠桌面程序。
- **我的当前理解**：JKai 知道开发模式通过不等于成品可用；能区分 npm 与 Vite 的职责；知道 Cargo 失败意味着桌面程序仍有问题；知道不同工具或依赖版本可能造成机器间结果不同。
- **Career Copilot 实际落点**：`package.json` 保存 npm 脚本；`vite.config.mjs` 配置前端开发与构建；`src-tauri/Cargo.toml` 定义 Rust 依赖；`package-lock.json`、`src-tauri/Cargo.lock` 和 `rust-toolchain.toml` 固定实际版本与工具链。
- **实际设计**：浏览器开发与桌面开发使用不同端口；Tauri 在开发时调用 Vite，在构建时先执行前端生产构建，再由 Cargo 生成桌面程序。
- **设计取舍**：锁定版本降低“同一代码在不同时间装到不同依赖”的风险，但升级依赖必须显式修改并重新验证。
- **易混淆点**：npm 不只是“配置需要的东西”；Vite 不负责最终屏幕显示；Cargo 构建通过也不能单独证明浏览器交互和真实桌面流程全部正常。

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
| Testing Layers | 已完成本轮学习 | 分别验证小规则、模块组合、浏览器流程和真实桌面运行 | unit、integration、E2E、desktop smoke |
| Reliability | 未学习 | 失败不能损坏职业事实、历史版本或最终文件 | failure mode、recovery、idempotency、observability |
| Privacy | 未学习 | 简历、经历材料和 API Key 都是敏感数据 | local-first、minimum retention、credential storage、deletion |

#### Testing Layers

- **状态**：已完成本轮学习。
- **知识正文**：不同检查回答不同问题。单元测试检查小规则；类型检查发现静态数据形状和代码使用矛盾；生产构建检查能否生成前端产物；浏览器 E2E 检查用户流程；桌面 smoke 实际启动 Tauri/WebView 窗口，检查桌面链路。任何一层通过都不能单独证明整个产品正常。
- **Career Copilot 为什么需要**：项目跨越 React、TypeScript、Rust、Tauri 和真实桌面环境，单一测试看不到所有失败位置。
- **我的当前理解**：JKai 知道个别功能通过不代表全部测试通过；类型检查不能代替生产构建；生产构建不能证明按钮流程；能正确选择浏览器流程测试和桌面启动测试覆盖对应风险。
- **Career Copilot 实际落点**：`src/application/*.test.ts` 检查演示服务规则；`npm run typecheck` 检查 TypeScript；`npm run build` 生成生产前端；`tests/e2e/` 运行浏览器流程；`tests/desktop/smoke.mjs` 连续两轮启动、操作、关闭并重启真实桌面窗口；`npm run check:rust` 检查 Rust 构建和测试。
- **实际设计**：`npm run check` 聚合文档、单元、类型、生产构建和浏览器 E2E；Rust 与真实桌面测试单独运行，因为耗时、环境和失败含义不同。
- **设计取舍**：只保留一种端到端测试命令更简单，但会把前端、Rust 和桌面环境问题混在一起，也可能让浏览器成功掩盖桌面失败。
- **易混淆点**：`typecheck 通过 = 程序可用`、`build 通过 = 按钮可用`、`浏览器 E2E 通过 = 桌面程序可用` 都不成立；测试结论不能超过它实际覆盖的范围。

## 3. 知识节点的渐进填写模板

```text
## 知识名称

状态：未学习 / 学习中 / 已完成本轮学习 / 待复习

为什么 Career Copilot 需要：
一句与当前产品有关的理由。

需要掌握：
- 子概念

知识正文：
待真正学到这里时补充。

我的当前理解：
只记录 JKai 的回答能够证明的内容；没有证据时写“待后续深化”。

易混淆点：
记录本轮真实出现过的误区；没有出现时不强行填写。

Career Copilot 实际落点：
待 Implementation Reflection 时补充真实文件、模块、配置、测试或数据结构。

实际设计与选择理由：
待 Implementation Reflection 时补充。

替代方案与 trade-off：
只记录实际讨论过的方案；没有讨论时保留为空。
```

## 4. 当前学习状态

M0-T1 已完成第一轮 `16/16` 学习。Learning Map Sync 已将本轮知识、JKai 当前理解与易混淆点写回软件组织和测试节点；Implementation Reflection 已使用现有代码、配置与测试补齐真实落点。该状态表示完成当前深度的知识—代码闭环，不表示 JKai 永久掌握。

本轮完成的知识层级是：

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

当前学习材料：`src/main.tsx`、`src/app/`、`src/application/demo-service.ts`、`src-tauri/src/main.rs`、`src-tauri/src/lib.rs`、`src-tauri/tauri.conf.json`、`src-tauri/capabilities/default.json`、`package.json`、`vite.config.mjs`、`tsconfig.json`、`src-tauri/Cargo.toml` 与 `tests/desktop/smoke.mjs`。

M0-T2 当前为 `1/14`，仅“持久化存储”通过；“工作区与数据位置”的检查题尚未回答。按 Task 级同步规则，M0-T2 对应节点暂不写入半程正文，等达到 `14/14` 后统一执行 Learning Map Sync。当前停止，不自动继续 M0-T2，也不进入 M0-T3。
