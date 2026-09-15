# Career Copilot — MVP Implementation Plan V1

**Goal**：完成 Local-first Desktop 的 Career Assets → Job Strategy → Portfolio → Resume Content → Final PDF → Application 闭环。

**Architecture**：Career / Job / Resume 业务用例通过 AI Gateway 和 Storage，AI 提案、代码约束、历史快照追加写。技术栈 Tauri、React、TypeScript、SQLite、本地文件、BYOK。

本计划保留原草案 M0–M8 与原 Task 编号，新增 M1-T6、M4-T6 补齐冻结功能遗漏。它只规定开发顺序，不规定学习顺序；[LEARNING_MAP.md](LEARNING_MAP.md) 按知识层级组织。每个 Task 必须通过 [WORK_MANUAL.md](WORK_MANUAL.md) 的 Learning Gate：全部 Learning Parts 通过后先完成 Learning Map Sync 并停止，获得 JKai 的明确实操授权才可修改实现文件；实操后再完成 Implementation Reflection。产品规则见 [PRODUCT_SPEC.md](PRODUCT_SPEC.md)，字段与合同见 [TECH_SPEC.md](TECH_SPEC.md)。

## 当前状态

开发暂停。M0-T1、M0-T2 的既有实现保持完成状态并作为学习材料；M0-T1 已完成 16/16 学习、Learning Map Sync 和基于现有代码的 Implementation Reflection。M0-T2 学习暂停在 1/14，未经 JKai 明确决定不继续学习，也不进入 M0-T3 实现。

- [x] DOCS-BASELINE：四份文档、一致性审查、AGENTS.md、文档测试与 Git 仓库准备。
- [x] DEMO-T1：前端交互 Demo，验证 Strategy → Portfolio → Resume → Final 的核心流程；仅使用内存合成数据。
- [x] DEMO-T2：落实六项界面反馈：阅读字号、单一 slogan、上下文 AI 助手与显式应用、资产草稿新增、能力重要性与纳入调整、缺口操作弹窗。AI 为离线交互演示，用户新增内容仅留当前会话。
- [x] M0-T1：Tauri 桌面应用初始化完成；复用现有内存 Demo，尚无数据库或真实 AI。
- [x] M0-T2：SQLite Storage、工作区目录、迁移/备份和失败恢复完成；演示资产仍为内存数据。
- [x] DEMO-T3：AI Side Panel 替代独立 AI 页面；当前上下文、明确目标、预览/应用/放弃、单步撤销、收起会话保留及响应式停靠。采用本地示例回复，未接模型或新增后端。

2026-09-07 环境预检：Git 2.53.0.windows.2、Node v24.11.1 可用；当前 PATH 无 rustc/cargo。该结果仅代表当前命令环境，不能断言机器完全未安装 Rust；M0-T1 先定位或安装工具链并验证桌面 prerequisites。

## Task 执行合同

每个表格行是一个 Task，包含目标、文件落点和可观察验收；不是让 Agent 一次实现整张表。目录是建议落点，按实际骨架细化，不预先建立大量空文件。进入 Task 时将该行细化为最小变更与测试；每次完成后在文末交付记录新增状态、实际验证和 commit，可使用新行保留历史。

固定步骤：只读检查当前 Task 与[知识树](LEARNING_MAP.md) → 识别知识层级并拆分稳定 Learning Parts → 逐 Part 讲解、理解检查和批改 → 全部通过 → **Learning Map Sync 并停止** → 仅在 JKai 明确说“可以开始实操”或“可以开始实现”后编写/更新测试与实现 → 验证 → **Implementation Reflection**，将真实代码落点和设计取舍补回原节点 → Git commit → 停止。主测试优先放在对应模块旁；跨模块/恢复测试放 `tests/integration/`，端到端放 `tests/e2e/`。任何步骤都不得跳过同步或自动衔接下一 Task。

## M0 — Project Foundation

前置 DOCS-BASELINE。完成后可启动桌面 App，Storage 可持久化并恢复，密钥安全保存，Gateway 完成结构化输出验证。

| Task | 输出 / 主要文件 | 必须验证 |
| --- | --- | --- |
| M0-T1 | 初始化 Tauri + React + TypeScript；package.json、锁文件、src/app/、src-tauri/、前端测试 | 桌面启动、基础导航、类型检查、前端测试/构建、Rust check/test；详细交接见下文 |
| M0-T2 | Storage：src-tauri/src/storage/、src-tauri/migrations/；SQLite、应用数据/临时目录、迁移 | 重启持久化、FK 生效、迁移失败回滚、文件写入失败恢复；测试用临时目录。UI 通过最小命令调用，不直接写库 |
| M0-T3 | Application Service：src/application/ 和受信任命令；明确读取/写入边界 | 同一业务规则不会散落 UI；篡改前端校验标志仍被命令拒绝；UI 测试使用服务 mock |
| M0-T4 | AI Gateway、任务合同、Settings 密钥配置；src/ai/、桌面 Provider/credential 适配 | Default/HQ、BYOK、结构化 fixture、非法 schema/超时拒绝、一次重试、无密钥泄漏；有配置时做真实 Provider smoke，无配置明确记录待验项 |
| M0-T5 | 完善统一测试入口、错误码/用户重试、自动检查 | 一键运行已有检查；Provider/存储错误可解释；前面 Task 的测试继续通过，不能把它当首次加测试的任务 |

### M0-T1 具体交接

目标：可启动的桌面壳与基础导航，复用已验收的前端 Demo、四文档和测试；本 Task 不扩展业务页面，不接业务数据库或真实 AI。

创建/更新：`package.json`、包管理锁文件、`index.html`、`tsconfig*.json`、构建/测试配置、`src/main.tsx`、`src/app/App.tsx`、`src/app/App.test.tsx`、`src-tauri/Cargo.toml`、`src-tauri/Cargo.lock`、Tauri 配置与 `src-tauri/src/` 入口；忽略本地构建产物。沿用现有 `tests/docs.test.mjs`。

- [x] 预检 `git status --short`、`node --version`、`npm --version`、`rustc --version`、`cargo --version`；检查 Windows C++ build tools 与 WebView2。缺失时先定位工具或安装受支持 prerequisites，完成后重跑。
- [x] 核验 Tauri 官方脚手架与 React/TypeScript 兼容要求，使用已验证版本建立骨架，保存前端与 Rust 锁文件。若生成器要求空目录，在临时目录生成后只合入骨架文件，不覆盖本仓库文档。
- [x] 增加导航行为测试：Home、Career Assets、Job Search、Library、Settings 可选择并正确显示当前页；AI Assistant 是侧栏底部开关，打开右侧面板而不跳页。沿用有明确演示标识的合成数据，不冒充正式业务数据。
- [x] 实现最小壳，固定脚本 `npm run dev`、`npm run test`、`npm run typecheck`、`npm run build`、`npm run tauri dev`。test 必须包含现有文档测试与前端行为测试。
- [x] 运行 `npm run test`、`npm run typecheck`、`npm run build`、`cargo check --manifest-path src-tauri/Cargo.toml`、`cargo test --manifest-path src-tauri/Cargo.toml`、`git diff --check`；预期全部退出 0。
- [x] 实际运行 `npm run tauri dev` 并验证桌面窗口、导航切换、关闭重启无错误。浏览器预览或仅前端构建不能代替桌面启动验收。
- [x] 更新此计划：具体版本、启动方式、真实测试结果、M0-T1 状态；检查 diff 后提交 `chore(M0-T1): initialize desktop application`。

交付门槛：上述全部通过才标 M0-T1 完成。环境阻塞时保留已完成工作和具体失败证据，保持任务未完成；不能只创建前端页面便宣称 Desktop App 已完成。

## M1 — Career Truth

前置 M0。手工建立 Experience → Project → Contribution → Fact → Evidence，保护 INV-01、INV-02、INV-08。

| Task | 输出 / 主要文件 | 必须验证 |
| --- | --- | --- |
| M1-T1 | Experience/Project/Contribution 创建编辑与 Archive/Restore，career 模块及对应迁移 | 层级 FK、READY 判定、非法父节点拒绝、归档恢复；被历史引用对象删除保护 |
| M1-T2 | Fact、Fact Revision、Verification/Risk/Ownership、Supersede/Retract，career 服务/迁移 | 新修订保留旧版本；current 指针归属；高风险显式 Review，口述不升级证据验证 |
| M1-T3 | Evidence Library、Evidence Version、hash、保留策略，Storage/解析与迁移 | 复制而非移动原文件；版本不覆盖；Extract & Forget 全文清理失败可恢复；不支持格式可存 |
| M1-T4 | fact_evidence_links 与来源片段定位，career detail | Revision 对应具体 Evidence Version；无效引用拒绝；多来源不丢失 |
| M1-T5 | Contribution Detail：摘要、Facts、Evidence、Capabilities/Usage 区，career UI | 默认 Facts；摘要事实变化进入 Review；后两区未实现时清楚显示待开发，不伪造结果 |
| M1-T6 | 补齐资产维护：Search/Filter、Move/Merge/Split、历史安全重构，career 服务/UI | 未引用可重构；被引用旧结构归档新建且旧链不变；搜索覆盖规定对象，筛选组合有效 |

## M2 — Career Import & Reconstruction

前置 M1。对应 Feature 01；关键使用 INV-01、INV-02、INV-07、INV-08。

| Task | 输出 / 主要文件 | 必须验证 |
| --- | --- | --- |
| M2-T1 | Import Batch/Queue 与运行态表，career import/Storage | 批量、逐文件失败、局部成功、重启恢复；不重复写入 |
| M2-T2 | Experience Clustering 与确认调整，AI task/导入界面 | 多材料归组、移动归组、非法 Evidence ID 拒绝；不自动确认结构 |
| M2-T3 | Project/Contribution Draft 重建，AI task/重建服务 | 用户调整确认后提交，Structure First；失败不回滚已确认其他段 |
| M2-T4 | Candidate Fact Extraction，AI schema/抽取服务 | 拆原子主张、保留不确定性、团队成果不升级、非法结构不进 Truth |
| M2-T5 | 去重、Conflict/Risk Review，career 审查界面/规则 | 无差异合并多来源；实质冲突待审；低风险明确证据自动接受留依据；高风险不绕过 Review |
| M2-T6 | Cold Start 双入口、旧简历导入、Quick Add Contribution 复用重建 | 第一段完成即可进入；其余排队；从零与导入同流程；旧简历高风险待审 |

## M3 — AI Interview & Capability

前置 M2。对应 Feature 02–03；能力派生不能阻塞 Truth。

| Task | 输出 / 主要文件 | 必须验证 |
| --- | --- | --- |
| M3-T1 | Gap-driven Interview、Session 与最小留存，career interview/迁移 | 一次一个问题，默认 3–5 个收敛、充分即停；Skip/暂停/恢复；非 opt-in 无长期全文 |
| M3-T2 | 回答转 Candidate Facts，复用抽取/审查 | 多事实、跑题提取、记不清、不诱导指标；更新 Truth 不动 Confirmed Portfolio |
| M3-T3 | Canonical Capability taxonomy/aliases，career seed/迁移 | 分类合法、alias 归一、重复/非 canonical ID 拒绝，不创建完整词表编辑器 |
| M3-T4 | Contribution Capability Analysis 与失效刷新，AI task/服务 | 支撑 Fact 可查；弱工具信号不夸大；事实更新触发异步刷新，失败旧值标过期 |
| M3-T5 | Capability View 与 Detail 实装，career UI | 分类/强弱/数量/时间/Why；用户补上下文而非直接改分；刷新不阻塞编辑 |

## M4 — Job Strategy

前置 M3。对应 Feature 04；保护 INV-03、INV-04。

| Task | 输出 / 主要文件 | 必须验证 |
| --- | --- | --- |
| M4-T1 | Create Job、JD 文本/文件输入、Direction 基础管理，job UI/迁移 | 必填校验、支持格式、方向可选；Job 是现实岗位而非 AI 报告 |
| M4-T2 | Job Analysis/Proof Requirement 与版本表，job 服务/AI schema | 3–6 PR、枚举区分、Coverage 关联 Fact、真实 Gap；禁止总匹配分 |
| M4-T3 | Strategy UI、稳定 Header/Strip/Context Panel，job UI | JD 原文与判断区分，Why/Gap 可操作；有 Gap 也可 Strategy Ready |
| M4-T4 | Job-triggered Interview 复用引擎，job/career 集成 | 仅合理缺口和相关资产追问；TRUE_CAPABILITY_GAP 可接受，不诱导编造 |
| M4-T5 | 重分析、资产/JD 过期提示、历史分析浏览，job 服务 | 新 Analysis 版本、JD snapshot/hash；旧 PR/Portfolio 引用不变，过期输入提交拒绝 |
| M4-T6 | Direction Master 分析入口及统一 scope 支持，job 服务/迁移 | 无真实 Job 可建母版分析；方向目标快照；Master 与 Specific scope 约束；不伪造 Job |

## M5 — Contribution Portfolio

前置 M4。对应 Feature 05；保护 INV-03、INV-04。

| Task | 输出 / 主要文件 | 必须验证 |
| --- | --- | --- |
| M5-T1 | Portfolio Recommendation（Job/Master）、基于母版差异，job AI/服务 | CORE/SUPPORTING/RESERVE、选/不选理由；组合边际价值；不生成 Bullet |
| M5-T2 | Proof Responsibility 关联，job 服务/迁移 | N:M 支持；PR 必须来自当前绑定 Analysis；入选项责任明确 |
| M5-T3 | Planned Fact Revisions 选择，job UI/服务 | Fact 归属、当前可信状态、RESERVE 不进入编译集合；非法 ID 拒绝 |
| M5-T4 | Add/Remove/Replace/Promote/Demote，job UI | 用户可坚持选材；不自动删除用户项；确认版本修改开新 Draft |
| M5-T5 | Impact：Coverage/Redundancy/Risk/Budget，job 服务/UI | 替换/移除后的覆盖损失可解释；旧快照不改；支持与母版轻量比较 |
| M5-T6 | Confirm Portfolio 事务与 snapshot，job 服务/迁移 | 未解决高风险 Planned Fact 阻塞；未选事实/接受 Gap 不阻塞；并发/重复确认幂等、全子项冻结 |

## M6 — Resume Content

前置 M5。对应 Feature 06；保护 INV-03、INV-04、INV-05。

| Task | 输出 / 主要文件 | 必须验证 |
| --- | --- | --- |
| M6-T1 | Resume Compiler/Content Items、计划与 provenance，resume AI/迁移 | 只用 Confirmed Portfolio/Allowed Facts；默认 6 bullets；引用/责任/顺序合法，无额外事实 |
| M6-T2 | Resume Workspace、排序、Content Context、轻量 Skills/Education/Summary | 直接看完整 Draft；结构调整重算预算/覆盖；事实性辅助内容同样有来源 |
| M6-T3 | Local Rewrite/Shorten/emphasis/Use Different Facts，resume 服务/UI | 只改当前 Item；同 Contribution 额外可信事实有显式授权并入快照，不改 Confirmed Portfolio |
| M6-T4 | Fact Consistency Check、编辑 Review，resume/career 集成 | 措辞可保存；指标变化/新 Claim/UNCLEAR 待审；可撤销/删 Claim/修订 Fact；ID 合法不绕过语义审查 |
| M6-T5 | Pinned Facts，resume UI/校验 | 改写保留 pinned 引用及语义；丢失/不明确被拒绝或 Review |
| M6-T6 | Clean Preview、Copy Bullet/Experience/All，resume UI | 隐藏分析/内部 ID；复制文本准确且不改变 Draft 状态；剪贴板失败可恢复 |
| M6-T7 | Mark Content Ready、Master/Specific 版本、上游影响局部更新，resume 服务/迁移 | CONTENT_READY 冻结；新修改新 Draft；从 Master 派生；额外授权和标题快照固定；只更新受影响 Items |

## M7 — Final Resume & Library

前置 M6。对应 Feature 07；保护 INV-02、INV-04、INV-06。

| Task | 输出 / 主要文件 | 必须验证 |
| --- | --- | --- |
| M7-T1 | Final PDF 上传/保存、绑定 Content Ready，resume/Storage | 一内容多文件；保存前文件/hash 成功；非 Ready 拒绝；文件/DB 失败恢复 |
| M7-T2 | Semantic Naming、Season/Version 字段，resume UI/服务 | 同名 PDF 可区分；显示名可改，文件 ID/hash 不因改名变化；版本号非字符串解析 |
| M7-T3 | Application Record/Mark Applied 与基本状态，resume 服务/迁移 | 真实投递明确确认；岗位/文件归属；同岗位多投；创建即原子 first_used_at 冻结，不能等下一 Task 才保护 |
| M7-T4 | Immutable Used Resume/Archive/VOIDED 全入口保护，resume/Storage | USED 替换/硬删拒绝；归档与 VOIDED 后仍拒绝；Application 文件绑定不能改 |
| M7-T5 | Library 三入口、检索筛选、Usage 实装，resume/career UI | Imported Files 复用 Evidence；按方向/公司/状态/Season 查找；贡献当前/历史用量可查 |
| M7-T6 | Version Lineage/Compare/Create from version、Historical Notice | 比较贡献/事实/文字/覆盖；parent 不成环；打开真实 Final；修订事实只提示，不改旧快照/PDF |

## M8 — Integration & Demo

前置 M7。完整闭环及失败路径测试，覆盖 INV-01–08；不趁集成补非 MVP 功能。

| Task | 输出 / 主要文件 | 必须验证 |
| --- | --- | --- |
| M8-T1 | Cold-start E2E，tests/e2e/ | 空库双入口、一段完成进入、混合文件失败可恢复、重启继续 |
| M8-T2 | Job E2E，tests/e2e/ | 资产 → JD/策略 → 组合 → 内容；Gap 可接受、高风险阻塞、全部 Claim 可追溯 |
| M8-T3 | Final E2E，tests/e2e/ | Ready → PDF → Application → 查回同一 hash 文件；同名区分、永久冻结 |
| M8-T4 | Failure Recovery，tests/integration/ | AI/解析失败、重启、导入中断、非法输出、重复提交、存储失败、隐私清理中断；已提交数据不丢 |
| M8-T5 | 合成 Demo Data/Flow，tests/fixtures/ 和演示说明 | 不依赖私人材料，演示所有阶段；真实模型 smoke 与 mock 测试分别记录 |
| M8-T6 | Scope Audit 与最终回归 | 关闭非 MVP 未完成入口，全部相关测试/验证通过；能力与限制如实呈现，无功能假完成 |

## 交付记录

DOCS-BASELINE 的一致性和验证范围记录在 [docs/CONSISTENCY_CHECK.md](docs/CONSISTENCY_CHECK.md)。该改动的 commit 通过 `git log --oneline` 查询，避免在提交自身内容里写无法预知的 hash。M0-T1 及以后每次交付在此追加实际完成状态和验证证据。

2026-09-08 DEMO-T1/T2：此前 Demo 尚未提交，本次一并提交可运行基线及反馈改动。文档、服务、类型、构建和浏览器验证记录见 [FRONTEND_DEMO.md](docs/FRONTEND_DEMO.md)。四份文档统一为“浏览器 Demo 已有，正式桌面/AI/存储未实现”；M0-T1 导航验收包含 AI Assistant，M0-T4 接入其 Gateway，M1/M2 实现资产草稿转事实，M4-T2/T3 实现能力侧重点的正式版本化与可操作缺口，均沿用原 Task 编号。

2026-09-08 M0-T1：新增 Tauri 2.11.4 + React 桌面壳、Rust 1.98.1 工具链固定、Windows 图标与最小权限配置、原生桌面 smoke 脚本及 [桌面开发与验收说明](docs/DESKTOP_SETUP.md)。Cargo check/test、debug 桌面程序构建、构建版与开发版真实 Tauri 窗口 smoke 均通过；两种模式各连续两轮验证启动、导航、AI 面板、示例简历流程、关闭与再次启动。M0-T1 完成，下一项为 M0-T2 Storage。

2026-09-09 M0-T2：以 `rusqlite 0.40.2` bundled SQLite 实现 [Storage 工作区](docs/STORAGE.md)，默认根目录为 Tauri `app_local_data_dir/workspace`。首次迁移创建内部 workspace identity，不提前创建 31 张业务表；每次连接启用 FK/WAL，迁移逐版本事务执行并在升级前在线备份。受管文件先写 pending 再移动，失败可由启动恢复清理，路径不能逃出工作区。设置页仅通过 `get_storage_info` 显示实际路径；浏览器明确无本地存储。Rust 合同、前端边界、浏览器设置页及真实桌面两轮重启验证通过。M0-T2 完成，下一项为 M0-T3 Application Service。
