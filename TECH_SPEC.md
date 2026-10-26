# Career Copilot — Technical Spec V1

基线：2026-09-07，交互与 M0-T1 补充：2026-09-08，Storage 基础补充：2026-09-09，个人工作区与模型连接：2026-10-26。本文约束正式实现；当前有独立的持久化个人工作区、桌面模型连接和内存 Demo。[产品行为](PRODUCT_SPEC.md)为业务依据；[执行计划](IMPLEMENTATION_PLAN.md)规定分阶段落地，不能在 M0 一次建完所有业务表。

Demo 补充合同：内存 DemoState 保存资产草稿、可编辑 Requirement 和 Proposal。Proposal 包含类型、目标、预期旧值、修改内容与 pending/applied/dismissed 状态；应用在服务内重新检查目标和旧值，过期或重复应用拒绝，失败不发布任何改动。资产描述不冒充 Fact。Confirmed Portfolio 同时保存 requirements 快照；调整重要性或纳入范围后须重新确认，新内容版本不覆盖旧 Ready。聊天上下文是用户选择的本轮快照，发送后仍可回看，刷新/重置清除；Demo 不向外部发送。正式 AI Assistant 复用现有 Gateway 与业务用例，新增事实继续走 Fact Extraction/Review，不另建平行业务系统或聊天数据库。

## 1. 架构边界

2026-10-26 个人工作区纵向切片：React `WorkspaceApp` → `career-service` → Rust `workspace_action/workspace_snapshot/attach_final_pdf/read_final_pdf` → SQLite 和受管文件。Migration 0002 按当前用例创建资产、追加事实修订、岗位要求版本、确认组合及子项、Ready 内容、真实 Final PDF、Application；这是 Schema V1 的增量落地，不代表 31 表蓝图及全部字段已实现。当前手工录入把一次输入作为 Experience → Project → Contribution，后续再扩展多项目编辑；岗位要求和内容计划保存 JSON 快照。暂不实现方向母版、能力 taxonomy、证据解析和访谈；模型连接增量见下文。姓名、联系方式和教育信息由用户在编译时输入并冻结到 Content Plan；核心经历内容逐字来自允许 Fact Revision，不做未经验证的自然语言改写。

事实的 review/revise/retract 携带 expected_revision_id，桌面事务重新检查当前版本、状态和资产可用性。高风险规则保守识别数字及职责主张，需要用户二次勾选；USER_CONFIRMED 不等于 EVIDENCE_VERIFIED。Ready 只追加，保存事实引用和文字，撤回原事实不重写旧快照。Final 先落盘再记录元数据；登记投递时重新读取并校验 SHA-256，事务内创建 Application 和永久使用锁。PDF 上传检查大小、文件头与结束标记，不宣称验证 PDF 全部语法或内容真实性。导出 HTML 会转义用户内容，不执行其中的标记。

可选进程环境变量 CAREER_COPILOT_WORKSPACE 只接受绝对路径，用于隔离测试或明确迁移的数据根目录；未设置时仍用 app_local_data_dir/workspace。本机 C 盘目录已通过 Junction 指向 D 盘，程序继续沿原路径访问，数据实际位于 D 盘。测试不得使用个人真实工作区。2026-10-26 已获用户所选上下文与指定接口的数据发送授权；仅用户主动发送才触发请求。

M0-T4 当前落点：`ai-service` → Rust `ai.rs` → 用户配置的兼容 Chat Completions 接口；默认模型用于助手/连接检查，高质量模型用于岗位分析。Key 经 keyring/windows-native 保存到系统凭据，按工作区 ID 和基础地址摘要隔离；SQL 只存非秘密配置和最小 AI 运行记录。HTTPS 远程、HTTP 仅回环地址，禁 URL 凭据/查询参数及重定向。45 秒单次请求超时、10 秒连接超时，最多两次尝试；结构化输出经严格字段/类型/长度校验。网络调用不持有数据库事务。

Schema V3 的 0003 迁移扩展 ai_runs，保存校验后的提案、目标版本和应用状态。调用只解析用户明确选择的当前事实修订及 JD；连接检查使用固定文本。完整 Prompt、原文上下文和密钥不写入运行日志。提案应用时在一个事务中重新检查目标与版本，复用 workspace 业务命令，再标记 APPLIED；重复应用返回已有结果。事实新修订为 UNCERTAIN，岗位要求新增版本；既有 Confirmed/Ready 不覆盖。放弃清除提案正文；收起只保留内存会话。个人版尚无直接改写 Ready Bullet 和单步撤销入口，这些交互仍属于独立 Demo；不宣称所有 AI Task 已落地。详见 [AI 连接](docs/AI_CONNECTION.md)。

AI Side Panel 实现合同：App 保存展开态与当前页面，Assistant 常驻挂载以保留收起后的会话；assistant-context 根据页面/Tab 枚举可编辑目标，点击内容可带入目标，发送时固定目标与上下文快照。FieldTarget 区分 description/bullet/requirement，字段修改经 DemoService 校验旧值和事实准入后写入；descriptions 只保存工作描述，不替代 Fact 或历史快照。Proposal 增加 undone 状态。单步 Undo 保存此次涉及的数据部分，撤销前核对应用后值；有后续修改时拒绝撤销，不触及 Ready/Final/Confirmed 历史。生产化继续复用现有业务用例，不把此内存实现当作数据库方案。

冻结栈：Tauri + React + TypeScript + SQLite + Local File Storage + BYOK AI Gateway。无独立 Node 后端、云服务、队列、账户系统。M0-T1 实际固定 Tauri CLI 2.11.4、tauri 2.11.3、tauri-build 2.6.3、React 19.2.8、TypeScript 7.0.2 与 Rust 1.98.1，并提交 npm/Cargo 锁文件；后续升级单独验证。

```text
React UI → Application Services → Career / Job / Resume
                               → AI Gateway → User Model Provider
                               → Tauri commands → Storage
                                                    SQLite / Files / Secure Key Store
```

只保持 Career、Job、Resume、AI、Storage 五个职责模块。UI 不直接读写 SQLite、不拼 Prompt、不自行判断可否确认或删除。AI Provider 仅通过 Gateway 调用；密钥读取和网络请求留在受信任的桌面侧，前端只拿配置状态。Application Service 组织用例；存储写入命令必须重新验证关键业务约束，不能信任前端传来的“已验证”标志。

推荐落点（随对应 Task 新建，不提前生成空架构）：`src/app/` 导航与组合；`src/features/{career,job,resume}/` 业务界面；`src/application/` 用例入口；`src/ai/` 无密钥的任务合同；`src-tauri/src/` 命令、业务校验与受信任适配；`src-tauri/migrations/` 迁移；`tests/` 文档、业务与集成测试。不要为每个对象机械创建 Repository 接口或引入 DDD/CQRS 框架。

React 使用简单数据读取/刷新与局部 UI state，持久业务数据来自 SQLite。命令返回结构化成功或稳定错误码，UI 提供恢复动作，不暴露原始堆栈/模型材料。

## 2. 数据及事务规则

- ID 为 TEXT UUID，时间戳采用 UTC ISO-8601，经历年月允许业务粒度而非伪造具体日期；数据库字段 snake_case。业务合同枚举以本文为准。
- 每个 SQLite 连接启用 `PRAGMA foreign_keys = ON`。外键保护历史引用，禁止对稳定快照引用链执行级联删除；外键不能验证 JSON 内 ID，Application Service 必须补检。
- 按父对象保证版本号唯一：Fact + revision_no、Evidence + version_no、分析/组合/内容的 scope owner + version_no。版本分配与写入在同一事务，避免并发重号。
- 关联表使用组合唯一约束；current_revision_id 必须属于当前 Fact，current_version_id 必须属于当前 Evidence。parent 链不能自指/成环；从 Master 派生到 Job 允许跨 scope parent，但需校验引用上下文。
- AI 网络调用与解析在事务外；正式提交时重新读取事实状态和版本，拒绝基于过期输入的确认，不能依赖调用前检查。使用输入版本/摘要和请求标识做重试幂等。
- 数据库迁移有序、可重跑检测、事务失败回滚；升级前备份。文件与 SQLite 不是同一事务：先写应用临时文件并验 hash，再移动到应用最终路径后提交元数据；失败留下可识别的待清理文件，启动恢复检查。不能在数据库记录成功时文件还未落盘。

## 3. 权威状态字典

| 对象/字段 | 允许值与含义 |
| --- | --- |
| Asset.status | DRAFT / NEEDS_ATTENTION / READY / ARCHIVED |
| Fact.state | ACTIVE / SUPERSEDED / RETRACTED；Candidate 保存在运行 Draft，不是正式 Fact 的第四状态 |
| Fact.type | RESPONSIBILITY / ACTION / METHOD / TOOL / OUTPUT / METRIC / IMPACT / SCALE / COLLABORATION / OWNERSHIP；一条事实选主类型 |
| FactRevision.verification_status | UNCERTAIN / USER_CONFIRMED / EVIDENCE_VERIFIED；无 AI_INFERRED |
| FactRevision.risk_level | LOW / MEDIUM / HIGH；早期 CRITICAL 收敛为 HIGH |
| FactRevision.ownership_scope | INDEPENDENT / LEAD / CORE_CONTRIBUTOR / CONTRIBUTOR / TEAM_RESULT / UNKNOWN |
| Evidence.type | DOCUMENT / LEGACY_RESUME / INTERVIEW / IMAGE / SPREADSHEET / OTHER |
| Evidence.privacy / retention | NORMAL / SENSITIVE；KEEP / EXTRACT_AND_FORGET |
| Evidence.status / parser_status | ACTIVE / ARCHIVED；PENDING / PARSED / UNSUPPORTED / FAILED |
| Capability.category / strength | DOMAIN / FUNCTIONAL / METHOD_TOOL / BEHAVIORAL；WEAK / MODERATE / STRONG |
| CapabilityPriority | CORE / DIFFERENTIATOR / SUPPORTING（能力侧） |
| ProofRequirement.priority | CORE / IMPORTANT / SUPPORTING（证明责任侧，不与能力枚举混用） |
| Coverage / Gap | COVERED / PARTIAL / GAP；UNDER_DOCUMENTED / WEAK_EVIDENCE / RESUME_COVERAGE / TRUE_CAPABILITY_GAP；OPEN / ACCEPTED / RESOLVED |
| Analysis.status | ACTIVE / SUPERSEDED，负载不原地重写 |
| Portfolio.status / item.role | DRAFT / CONFIRMED / SUPERSEDED；CORE / SUPPORTING / RESERVE |
| ResumeContent.scope / status | DIRECTION_MASTER / SPECIFIC_JOB；DRAFT / CONTENT_READY / SUPERSEDED |
| ResumeItem.section / type | EXPERIENCE / PROJECT / SKILLS / SUMMARY / EDUCATION；BULLET / TEXT_BLOCK |
| FinalResume.status | FINAL / USED / ARCHIVED；冻结不能只由当前显示状态判断 |
| Application.status / outcome | APPLIED / IN_PROCESS / ENDED / VOIDED；OFFER / REJECTED / WITHDRAWN / UNKNOWN |
| ImportBatch.status | UPLOADING / CLUSTERING / RECONSTRUCTING / PARTIAL / COMPLETED / FAILED |
| ImportFile.status | READY / NEEDS_ATTENTION / FAILED / COMPLETED |
| Reconstruction.stage / status | CLUSTER / STRUCTURE / FACT_EXTRACTION / REVIEW；DRAFT / VALIDATED / COMMITTED / FAILED |
| Interview.trigger / status | RECONSTRUCTION / CAREER_ENRICHMENT / JOB_GAP；ACTIVE / PAUSED / COMPLETED |
| AIRun.status | PENDING / SUCCESS / FAILED |

Job 的界面进度从选定当前分析、组合、内容、Final、Application 派生：DRAFT → JD_READY → STRATEGY_READY → PORTFOLIO_REVIEW → PORTFOLIO_CONFIRMED → RESUME_DRAFT → CONTENT_READY → FINAL_UPLOADED → APPLIED。允许新工作分支；不能因新 Draft 抹掉历史 Applied。`jobs.status` 只承担活动/归档生命周期，不另存一套必须同步的线性阶段。CONTENT_READY 替代早期 UI 文案 Resume Confirmed；FINAL_UPLOADED 是流程状态，不是内容版本状态。

## 4. 不变量的实现合同

以下 INV 编号对应 PRODUCT_SPEC.md；必须在相应 Task 加入成功、拒绝及失败恢复测试。

| 规则 | 确定性执行边界 |
| --- | --- |
| INV-01 | 抽取输出只进 Draft；业务规则不能把 confidence 转为 verification。保留用户确认/审查记录与来源类型，高风险必须显式 Review；团队成果不转成个人主导 |
| INV-02 | 已提交 Fact Revision 采用追加写；修改验证状态或文本也创建新 Revision，保留旧来源关系。事实类型/归属如改变历史含义，创建新 Fact 并 Supersede 旧 Fact；不移动历史 Fact 到新 Contribution。重构已引用结构时复制/关联必要新事实，旧链保持可解释 |
| INV-03 | `confirmPortfolio` 检查 scope、引用存在、Planned Facts 归属对应 Contribution；CORE/SUPPORTING 有证明责任；实际使用的 HIGH + 未解决状态阻塞。RESERVE 不进入编译 Allowed Facts。`markContentReady` 和新编译再验当前可用性；已修订事实提示刷新到新版本，不自动升级旧引用 |
| INV-04 | Confirm 原子冻结父记录及所有子项/关联。CONTENT_READY 保存内容、标题上下文、排列、授权、来源集合；新 Draft 复制后编辑。SUPERSEDED 仅更新生命周期元数据，不允许重写快照负载。已被 Portfolio 引用的分析/Proof Requirement 不直接改 Coverage/Gap，接受 Gap 或刷新创建新分析版本并让工作 Draft 显式重新绑定 |
| INV-05 | 编译输出引用是 Allowed Facts 的子集，Proof Requirement 属于绑定分析，事实属于引用 Contribution。手工变更或模型改写须审查语义；有 ID 但新增指标仍拒绝/Review。Pinned 同时校验引用集合及内容保留；不明确时不当作通过 |
| INV-06 | `markApplied` 同一事务创建 Application 并设置永久 first_used_at；文件已存在/hash 可核对、内容 Ready、岗位归属正确。used_at 非空或任一历史 Application 存在即禁止替换/硬删（包括 VOIDED）。状态/Outcome 更新不改变 job_id、file_id 或首次使用锁 |
| INV-07 | Draft → 校验 → Commit，重试同一已提交请求只返回原结果。Provider、解析、校验失败不写正式资产；提交前校验输入未过期 |
| INV-08 | 文件删除与全文清理为可恢复过程；成功后才记录清理完成。Evidence Versions.extracted_text、临时文件、运行草稿、AI 输出中复制的全文都遵循清理策略，仅保留最小已确认片段和引用。默认日志不收集全文 |

新增其他可信 Fact 供当前 Resume 使用时，允许集合 = Confirmed Portfolio 中实际入选的 Planned Facts + 用户显式授权的同一 Contribution 可信 Revisions。额外授权记录在工作版 `content_plan_json`，包含 Revision ID、确认时间；验证后写入快照。变更为新的 Contribution 则回 Portfolio 创建新版本。不存在“用户授权后就可直接使用 UNCERTAIN”的旁路。

旧快照可继续引用当时的 Revision；新编译/确认须提示已修订或撤回，不自动替换旧内容。Historical Notice 由当前事实和旧引用比较派生，不新建 Notice 领域表。

## 5. Schema V1 的必要补齐

原数据库草案是概念字段表，不是可直接运行 DDL。下列补齐服务已冻结产品行为，属于本次实现决策；不声称在原对话已逐字段冻结。实际迁移在对应 Task 编写。

1. **Direction Master**：原 Analysis/Portfolio 只支持 job_id，无法独立创建方向母版。在 `job_analysis_versions`、`contribution_portfolios` 增加 scope_type、career_direction_id，job_id 对 Master 可空。Master：direction 非空、job 为空；Specific：job 非空、可有关联 direction，必须与 Job 一致。Master 分析保存方向/target_roles 输入快照和 hash，JD 字段可空；真实 Job 分析必须有 JD 快照。Portfolio 引用同 scope 的 Analysis。无需伪造 Job 或新增平行业务表。
2. **事实 Review**：`fact_revisions` 增加 `review_metadata_json`（确认来源、时间、风险审查结果），不得只靠 verification 推断完成高风险 Review。低风险明确证据自动接受也记录规则依据。用户口述来源仅可支持 USER_CONFIRMED。
3. **历史上下文**：Portfolio 增加 `snapshot_context_json` 保存选择时的 Contribution/Experience 标题、预算和覆盖；Resume `content_plan_json` 保存显示头部、密度、排序、额外允许事实与轻量非核心段落元数据。基础教育/技能内容仍可作为 Content Item，其事实性主张使用同一 Fact 链，不建第二事实系统。
4. **永久锁与检索**：Final 增加 `first_used_at`；Resume Content 与 Final 增加 `season` 用于筛选，Final 增加 `version_no` 区分同一来源多份文件。版本号不从显示名解析。归档不清空使用时间，VOIDED 不删关联。
5. **派生过期标识**：能力关联保存输入 Revision 摘要与刷新状态；AI 失败保留旧值。分析保存输入资产摘要便于提示过期。仅必要元数据，不加事件总线。

只在实际迁移中逐 Task 加所需字段、索引、CHECK 和 FK；新增字段须更新本文与相关测试。原 Schema 共 **31 张表/关联表**，不是早期概念收缩时估算的 15 张；不为被收缩概念另建实体。

## 6. AI Architecture / Prompt Contract

业务调用统一：Context Preparation → Model Call → Structured Output → Schema Validation → Business Rule Validation → Draft → Commit。每个合同必须定义 Task、Context、Allowed Actions、Output Schema，采用 JSON Schema/typed output，不用 Markdown 正则解析正式业务结果。

| 任务族 / Prompt | 最小输入 | 必须输出及边界 |
| --- | --- | --- |
| Career Reconstruction / career_reconstruction_v1 | Experience 元数据、相关材料片段/描述、已有结构 | Project/Contribution drafts、source_evidence_ids、confidence、notes；聚类/结构分阶段确认，不确认高风险事实 |
| Fact Extraction / fact_extraction_v1 | Contribution、来源片段、已有 Facts、可选访谈回答 | content、fact_type、risk_level、ownership_scope、supporting_evidence、confidence、potential_conflicts；原子 Candidate Facts，unknown 优于编造 |
| Capability Analysis / capability_analysis_v1 | Contribution、有效 Fact Revisions、canonical taxonomy | capability_id、strength、supporting_fact_revision_ids、reason；不能用单个工具词夸大能力 |
| Job Strategy + Portfolio / job_analysis_v1 | JD 或方向目标、能力聚合、相关可信资产 | role_essence、role_archetype、capability_priorities、proof_requirements、coverage、gaps、recommended_strategy、candidate_contributions；3–6 个证明责任，无总匹配分 |
| Job Strategy + Portfolio / portfolio_builder_v1 | Proof Requirements、候选、能力关系、事实质量、当前组合、预算 | role、proof_responsibilities、planned_fact_revision_ids、selection_reason、marginal_value、redundancy、fact_risk；优化组合，不编写最终 Bullet |
| Resume Compiler / resume_compiler_v1 | 策略、Confirmed Portfolio、Allowed Facts、Content Plan | text、contribution_ids、fact_revision_ids、proof_requirement_ids、顺序/计划；只改写、压缩、重组，不加事实 |
| 辅助检查 / fact_consistency_v1 | before、after、referenced Facts | NARRATIVE_ONLY / POTENTIAL_FACT_CHANGE / NEW_FACTUAL_CLAIM / UNCLEAR；后三类进入规则审查，模型不能自行批准 |

五类核心任务族包含多个 Prompt；辅助检查与访谈提问复用既有任务，不新造第六套业务模块。Job Interview 的输入必须有相关资产、部分事实与合理 Gap；默认 3–5 个问题、支持 Skip、恢复。

Gateway 概念接口 `generateStructured(task, context, schema, modelPreference)`；`generateText` 只用于不写正式业务数据的展示。Settings 只设 Default Model、High Quality Model；前者抽取/分类，后者策略/组合/内容。API Key 由系统安全凭据存储保管，前端只有 saveApiKey、getApiKeyStatus、deleteApiKey，不提供取回完整 Key 的 UI 接口。

校验分层：JSON/字段/enum 属于 Schema；ID 存在、归属、当前状态、Allowed Facts、快照、风险属于确定性业务检查。语义真实性检查属于辅助判断，失败或不明确返回 Review，不宣称 Schema 可以证明自然语言真伪。

每个逻辑调用最多初次 + 一次自动重试（网络失败或结构修复共享该预算），仍失败标记并允许用户手动 Retry/换模型。无复杂自动 fallback。ai_runs 记录 provider/model、prompt_version、output_schema_version、input_hash、状态、时间、脱敏错误及必要已验证输出；不长期保存完整 Prompt、原始材料或无效原始响应。

## 7. 文件、隐私及失败恢复

应用数据根目录使用 Tauri `app_local_data_dir/workspace/`：`app.db`、`evidence/`、`final-resumes/`、`temp/`。独立子目录避免把 WebView 缓存混入数据工作区；实际位置由受信任命令返回。SQLite 只存路径/hash/元数据及必要解析内容，不存 PDF/DOCX BLOB。所有路径由 Storage 生成、限制在工作区；不信任上传文件名作为路径。证据使用独立 version 路径，不能覆盖旧文件。当前未实现跨设备 Export/Import、云同步或便携模式；源代码可通过 Git 移动，用户工作区不能被描述为已自动便携。

Extract & Forget 在用户确认前保留临时恢复能力，确认后删除应用副本及完整解析缓存，仅保留 hash、文件名、来源位置与最小相关片段。清理失败标记待处理并重试，不宣称已删除。INTERVIEW 默认只留可恢复最小状态和事实片段，完成后清除临时完整上下文；只有明确 opt-in 才存 full_transcript_json。

日志限 task、duration、status、error_code、model、record_id；不记 API Key、完整 JD、简历、访谈或 Evidence。密钥不可写 SQLite、明文配置、日志、源码；系统凭据不可用时返回可恢复配置错误，不降级明文存储。

关键错误：解析不支持/失败、Provider 配置/超时、Invalid output、Fact review required、Stale input、Snapshot immutable、File unavailable、Storage failure。保留可重试 Draft，不吞错；UI 明确下一步操作。

## 8. 验证与 M0 边界

M0-T1 已提供文档与服务单元测试、浏览器流程、类型检查、前端构建、Cargo check/test，以及真实 Tauri/WebView2 的构建版和开发版窗口 smoke。桌面 smoke 连续两轮检查启动、基础导航、AI 面板、示例简历流程、关闭与再次启动；详细命令见 [桌面开发与验收说明](docs/DESKTOP_SETUP.md)。M0-T5 继续完善统一错误与自动化测试框架，不作为前期免测理由。

后续测试重点为 INV-01–08：历史不可变、非法准入拒绝、真实 PDF 绑定、回滚/幂等/重启恢复。模型使用固定结构化 fixture/mock 验证合同与拒绝路径，另做小规模真实 Provider smoke；不逐字断言模型文案。M8 用合成材料验证完整闭环。每个 Task 必须测试并提交，详见工作手册。

## 9. Schema V1 字段速查

下表转录原对话 Database Schema V1 的字段及枚举；第 3–5 节为最终约束与补齐。它是迁移蓝图，尚不是可执行 Schema。JSON 内引用同样要验证，表数与字段不代表已建表。

<!-- schema-inventory -->

| 表 | 原始字段（枚举跟随字段） |
| --- | --- |
| `experiences` | id · type · organization · role · start_date · end_date · is_ongoing · status · DRAFT / NEEDS_ATTENTION / READY / ARCHIVED · summary · created_at · updated_at |
| `projects` | id · experience_id · title · description · business_context · start_date · end_date · status · created_at · updated_at |
| `contributions` | id · project_id · title · summary · status · DRAFT / NEEDS_ATTENTION / READY / ARCHIVED · created_at · updated_at |
| `facts` | id · contribution_id · fact_type · state · ACTIVE / SUPERSEDED / RETRACTED · current_revision_id · created_at |
| `fact_revisions` | id · fact_id · revision_no · content · verification_status · UNCERTAIN · USER_CONFIRMED · EVIDENCE_VERIFIED · risk_level · LOW / MEDIUM / HIGH · ownership_scope · INDEPENDENT · LEAD · CORE_CONTRIBUTOR · CONTRIBUTOR · TEAM_RESULT · UNKNOWN · supersedes_revision_id · created_at |
| `evidence` | id · display_name · evidence_type · DOCUMENT · LEGACY_RESUME · INTERVIEW · IMAGE · SPREADSHEET · OTHER · privacy_level · NORMAL / SENSITIVE · retention_policy · KEEP / EXTRACT_AND_FORGET · status · ACTIVE / ARCHIVED · current_version_id · created_at |
| `evidence_versions` | id · evidence_id · version_no · original_filename · mime_type · stored_path · sha256 · parser_status · PENDING / PARSED / UNSUPPORTED / FAILED · extracted_text · file_deleted_at · created_at |
| `fact_evidence_links` | id · fact_revision_id · evidence_version_id · source_locator · source_snippet · created_at |
| `capabilities` | id · name · category · DOMAIN · FUNCTIONAL · METHOD_TOOL · BEHAVIORAL · parent_id · aliases_json · is_canonical · status · ACTIVE / ARCHIVED |
| `contribution_capabilities` | id · contribution_id · capability_id · strength · WEAK / MODERATE / STRONG · reason · supporting_fact_revision_ids_json · ai_run_id · updated_at |
| `career_directions` | id · name · description · target_roles_json · status · ACTIVE / ARCHIVED · created_at · updated_at |
| `jobs` | id · career_direction_id NULLABLE · company · role_title · jd_current_text · job_url · location · source · notes · status · created_at · updated_at |
| `job_analysis_versions` | id · job_id · version_no · jd_snapshot_text · jd_hash · role_essence · role_archetype · positioning · strategy_summary · capability_priorities_json · narrative_order_json · coverage_summary_json · gaps_json · candidate_evaluations_json · ai_run_id · status · ACTIVE / SUPERSEDED · created_at |
| `proof_requirements` | id · job_analysis_version_id · title · description · priority · CORE / IMPORTANT / SUPPORTING · coverage_status · COVERED / PARTIAL / GAP · coverage_reason · gap_type NULLABLE · UNDER_DOCUMENTED · WEAK_EVIDENCE · RESUME_COVERAGE · TRUE_CAPABILITY_GAP · gap_status · OPEN / ACCEPTED / RESOLVED · recommended_action · position |
| `proof_requirement_capabilities` | proof_requirement_id · capability_id |
| `contribution_portfolios` | id · job_id · job_analysis_version_id · version_no · parent_portfolio_id NULLABLE · status · DRAFT / CONFIRMED / SUPERSEDED · created_at · confirmed_at |
| `portfolio_items` | id · portfolio_id · contribution_id · role · CORE / SUPPORTING / RESERVE · selection_reason · unique_value · position |
| `portfolio_item_proof_requirements` | portfolio_item_id · proof_requirement_id |
| `portfolio_item_fact_revisions` | portfolio_item_id · fact_revision_id |
| `resume_content_versions` | id · scope_type · DIRECTION_MASTER · SPECIFIC_JOB · career_direction_id NULLABLE · job_id NULLABLE · job_analysis_version_id NULLABLE · portfolio_id NULLABLE · parent_version_id NULLABLE · version_no · status · DRAFT / CONTENT_READY / SUPERSEDED · content_plan_json · created_at · confirmed_at |
| `resume_content_items` | id · resume_content_version_id · section_type · EXPERIENCE · PROJECT · SKILLS · SUMMARY · EDUCATION · experience_id NULLABLE · project_id NULLABLE · item_type · BULLET / TEXT_BLOCK · text · section_order · item_order · created_at |
| `resume_item_contributions` | resume_content_item_id · contribution_id |
| `resume_item_fact_revisions` | resume_content_item_id · fact_revision_id · is_pinned |
| `resume_item_proof_requirements` | resume_content_item_id · proof_requirement_id · is_primary |
| `final_resume_files` | id · resume_content_version_id · display_name · original_filename · stored_path · sha256 · status · FINAL / USED / ARCHIVED · created_at |
| `applications` | id · job_id · final_resume_file_id · applied_at · channel · status · APPLIED / IN_PROCESS / ENDED / VOIDED · outcome · OFFER / REJECTED / WITHDRAWN / UNKNOWN · note · created_at · updated_at |
| `import_batches` | id · status · UPLOADING · CLUSTERING · RECONSTRUCTING · PARTIAL · COMPLETED · FAILED · created_at · updated_at |
| `import_batch_files` | id · import_batch_id · evidence_version_id · cluster_key · proposed_experience_name · status · READY · NEEDS_ATTENTION · FAILED · COMPLETED · error_message |
| `reconstruction_runs` | id · import_batch_id · experience_id NULLABLE · stage · CLUSTER · STRUCTURE · FACT_EXTRACTION · REVIEW · status · DRAFT / VALIDATED / COMMITTED / FAILED · draft_output_json · ai_run_id · error_message · created_at · updated_at |
| `interview_sessions` | id · contribution_id · trigger_type · RECONSTRUCTION · CAREER_ENRICHMENT · JOB_GAP · job_id NULLABLE · status · ACTIVE / PAUSED / COMPLETED · target_gap_json · session_state_json · keep_full_transcript · full_transcript_json NULLABLE · interview_evidence_id · created_at · updated_at · completed_at |
| `ai_runs` | id · task_type · provider · model · prompt_version · output_schema_version · input_hash · status · PENDING / SUCCESS / FAILED · validated_output_json · error_code · error_message · created_at · completed_at |
