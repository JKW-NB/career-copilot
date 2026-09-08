# Career Copilot — Product Spec V1

基线：2026-09-07；2026-09-08 补充用户反馈并完成 M0-T1。状态：已有可启动的 Tauri 桌面应用和浏览器交互 Demo；持久化与真实 AI 尚未实现。来源及一致性结论见 [一致性检查](docs/CONSISTENCY_CHECK.md)。本文负责产品行为；存储、枚举与执行约束分别见 [TECH_SPEC.md](TECH_SPEC.md)、[WORK_MANUAL.md](WORK_MANUAL.md)、[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)。

## 1. 目标与范围

面向已有实习、项目和旧材料的早期职业用户，把零散材料沉淀为可信、可复用的 Career Assets，再针对岗位给出可解释的选材与简历内容方案。成功标准是用户面对新 JD，主要审核、纠偏和确认方案，不再从零翻找全部经历。

MVP 必须走通：材料 → Career Assets → Job Strategy → Contribution Portfolio → Resume Content → 外部排版 → Final PDF → Application。采用单用户、Local-first 桌面应用，用户自带模型 API Key（BYOK）。排版交给超级简历等外部工具，应用提供可复制内容并记录最终上传 PDF。

不纳入 MVP：云同步、账户/协作、后端服务器、完整求职 CRM、面试轮次和日历、总匹配分/职业能力总分、富文本排版和模板/PDF 生成、自动抓取岗位网页、全盘扫描、复杂无限画布、独立 Bullet 版本树、最终 PDF 回读比对、Excel 单元格深度解析、能力本体编辑器、基于投递结果的成功率推断。

## 2. 领域与导航

| 层 | 对象与职责 |
| --- | --- |
| Career Truth | Experience 是经历容器；Project 是项目；Contribution 是个人贡献与选材单位；Fact 是独立事实身份，Fact Revision 是具体内容及可信状态；Evidence Version 保存对应材料版本 |
| Career Intelligence | Capability 为统一能力词表；Contribution 与能力的关系由 Fact 派生，Profile 聚合展示，不能直接改分 |
| Job Strategy | Career Direction 为方向；Job 为现实岗位；Job Analysis Version 保存岗位分析；Proof Requirement 表达必须证明什么；Portfolio 决定用哪些 Contribution 和 Fact Revision |
| Narrative & Record | Resume Content Version 保存内容计划及 Content Items；Final Resume File 是独立最终文件；Application 是真实投递记录 |

关系：Experience 1:N Project 1:N Contribution 1:N Fact 1:N Fact Revision；Fact Revision N:M Evidence Version；Content Item N:M Contribution / Fact Revision / Proof Requirement。Contribution 不等于 Bullet，允许一对多和多对一表达。

顶层页面：Home、Career Assets、Job Search、Library、Settings。左侧另有轻量 AI Assistant 入口，切换右侧面板，不跳转页面。Home 只汇总可执行待办，不另建 Task Center。Career Assets 提供 Experience / Capability / Evidence 三个视图，默认树展示到 Contribution，Fact 收起。

2026-09-08 交互补充（JKai 明确提出）：正文以 15–16px 为阅读基准，辅助文字不小于 13px；只在今日概览保留一句 slogan。职业资产提供显式新增入口；自由描述先存草稿，经过事实抽取/审查才能用于简历。岗位能力显示说明、JD 依据与核心/重要/辅助重要性，用户可新增能力、调整重要性或不纳入本次简历；保留原岗位来源，修改不覆盖历史分析。点击覆盖缺口直接展示原因、补入现有贡献、新增资产、询问助手及保留缺口的操作。

AI Assistant 默认收起。打开后桌面采用主内容缩窄 + 右侧面板，窄屏采用下方停靠面板；当前页面继续可操作，收起保留会话。面板包含当前页面与具体目标、对话、少量快捷操作、底部输入和收起按钮。支持开放提问、选择工作区对象或划选文字作为本轮上下文；多个目标须明确选择。普通解释直接展示，修改类回复固定显示目标路径、修改前后与“应用修改 / 暂不应用”，确认后立即更新目标区域并反馈“已应用”。切换页面不改变旧建议的目标。可撤销最近一次 AI 修改；若相关内容已有后续变化则拒绝覆盖。

当前 Demo 用本地示例回复，不引入后端。可应用的目标包括项目描述、资产草稿、岗位能力说明和简历 Bullet；新增描述不直接成为 Fact，Bullet 仅重排已可信事实并保留固定项，未知事实被规则拒绝。删除限草稿，组合移除保留资产和历史。正式 AI、事实抽取/审查和持久化仍待后续任务。

具体岗位固定四个 Tab：Strategy（理解）/ Contributions（选材）/ Resume（表达）/ Final（记录）。共享岗位头部、可收起的策略摘要与解释依据的 Context Panel；JD 原文放 Strategy，不增设第五个 Tab。允许返回上游调整，提示下游影响，不强制从头重来。

## 3. 全局业务不变量

- **INV-01 事实边界**：AI 推断和置信度不是 Fact 的验证状态。不得制造数字、规模、影响或提升 Ownership。旧简历和口述可作来源，但不能仅凭其存在标为 EVIDENCE_VERIFIED。
- **INV-02 版本与历史**：事实语义变化新增 Revision，历史 Revision 不覆盖；Evidence 更新新增 Version。被稳定快照或投递引用的结构不得硬删除或改写其历史含义。
- **INV-03 事实准入**：新内容默认只用 ACTIVE Fact 的当前、已验证或用户确认的 Revision。UNCERTAIN 先 Review；RETRACTED / SUPERSEDED 默认不得用于新内容。计划使用且未解决的高风险事实阻塞确认；未选事实及真实能力 Gap 不应阻塞整份 Portfolio。
- **INV-04 决策快照**：Confirmed Portfolio、CONTENT_READY 内容及其引用集合不随 AI 重算变化；修改产生新版本。更新 Career Assets 只提示旧分析可能过期。
- **INV-05 Claim 溯源**：每个事实性 Claim 能追溯 Content Item → Fact Revision → Contribution → Evidence 或用户确认；引用 ID 存在不代表文案语义必然真实，仍需内容一致性审查。
- **INV-06 投递历史**：Application 绑定具体 Final PDF；首次使用后文件永久冻结。归档或作废 Application 不得解除冻结；状态/结果可更新，绑定文件不可偷偷更换。
- **INV-07 AI 写入**：模型只提案；代码验证结构、引用、权限及业务状态后提交。失败保留已确认数据，可恢复和重试。
- **INV-08 最小留存**：默认保存本地文件副本；Sensitive 仅发送最小必要上下文。Extract & Forget 在确认后删除应用副本、完整解析文本与临时全文，只保留最小事实溯源；不删除用户原文件。访谈默认不长期保存完整 Transcript。

## 4. Feature Spec 01 — Cold Start / Career Import

入口：Import existing materials / Start from scratch；Paste a JD 为辅助入口，不强制填写个人资料。批量材料先按 Experience 聚类，用户调整分组，再逐段生成 Project → Contribution 草稿；确认结构后抽取 Candidate Facts。

从零开始只填最小经历信息，加自由描述或文件，复用同一重建流程。完成第一段即可进入 Career Assets，其余保留 Import Queue。每文件/阶段可局部成功、失败重试、重启恢复，重复提交不得重复生成资产。

风险审查：低风险、直接证据明确且通过规则校验可自动接受；高风险、低置信度或冲突进入 Review。数字/Ownership/范围/结果性质冲突不能按来源数量投票；仅无实质差异的重复事实可合并并保留多来源。记不清可保留 UNCERTAIN。

自动解析限定有文本层 PDF、DOCX、Markdown、TXT。XLSX/CSV、PPTX、图片及其他附件可保存、描述和人工关联，不承诺深度解析或 OCR；解析失败给出人工补充路径。

验收：混合有效与失败文件只阻塞对应项；确认一段资产后可进入产品；重试与重启不丢已提交内容；旧简历中的高风险主张进入 Review。

## 5. Feature Spec 02 — Career Assets

Experience / Project / Contribution 可新增、编辑、Archive、Restore；Quick Add Contribution 复用重建，直接新增 Fact 走用户确认及风险审查。Contribution Detail 为摘要 + Facts / Evidence / Capabilities / Usage，默认 Facts。摘要措辞可改，涉及事实变化必须回 Fact 层。

资产状态统一 DRAFT / NEEDS_ATTENTION / READY / ARCHIVED。Contribution 有清楚摘要、有效 Fact、无阻塞冲突且关键高风险主张已处理即可 READY，不要求补齐所有可选信息。

支持 Rename / Move / Merge / Split；未引用对象可直接重构，已被历史引用的旧结构归档并创建新结构，旧引用保留。事实可修订、替代、撤回，不以普通 Archive 代替 Fact 生命周期。

Capability 按 DOMAIN / FUNCTIONAL / METHOD_TOOL / BEHAVIORAL 分类，显示强弱、支撑数量、最近证明时间及 Why；后台允许 WEAK，默认重点展示 MODERATE / STRONG。用户补事实而不是改分；事实及结构变化触发异步刷新，失败保留旧结果并标记过期。

统一搜索 Experience、Project、Contribution、Fact、Capability、Evidence 名称；筛选状态、类型、时间和能力。Evidence 为文件库加引用关系；Usage 显示当前/历史 Portfolio、Resume、Final、Application 使用位置，不做复杂图。

验收：Fact 可定位来源；历史引用对象不能硬删；Merge/Split 不改变旧简历含义；能力计算失败不阻塞事实保存。

## 6. Feature Spec 03 — AI Interview

由 Reconstruction、Career enrichment 或 Job gap 触发，共用同一引擎。每次一个高价值主问题，默认 3–5 个后收敛，充分即停；允许 Skip、中断恢复和记不清，不追求信息完整率。

一次回答可提多个 Candidate Facts；跑题先提取有效信息再聚焦。继续去重、冲突与风险审查；不能诱导量化、Ownership 或业务成果。Job-triggered 只追问有相关 Contribution、部分事实及合理缺口的情况。

默认长期保存 Session 元数据和与 Fact 直接相关的回答片段；用户选择后才保留完整 Transcript。更新 Truth 与 Capability，不静默改 Confirmed Portfolio。

验收：跳过/暂停/恢复有效；同一回答多事实；高风险仍 Review；未选择保留时无长期完整对话。

## 7. Feature Spec 04 — Job Strategy

输入 Company、Role、JD，Direction 可选；JD 支持粘贴和支持格式文件。展示理解岗位、提取能力、建立证明责任、对照资产、准备策略等进度。

输出先给 Role Essence 和简短 Positioning，再给能力优先级、3–6 个 Proof Requirements、Coverage、Gap、短策略与候选 Contribution。明确区分 JD 原文和 AI 判断，Why 提供 JD 片段、引用事实和简短理由。

Coverage 使用 COVERED / PARTIAL / GAP，关联具体 Contribution 和 Fact；不提供总 Match Score。Gap 为 UNDER_DOCUMENTED / WEAK_EVIDENCE / RESUME_COVERAGE / TRUE_CAPABILITY_GAP；前两类可追问，第三类调整选材，第四类允许接受。

有效分析、Proof Requirements、Coverage 和策略生成后即 STRATEGY_READY，不要求消除 Gap。JD 或资产更新只提示过期；重分析新增版本并保存当时 JD。可对比 Direction Master 的侧重点差异。

验收：无相关能力时诚实输出 Gap；分析和下游绑定版本可追溯；重分析不覆盖旧版本。

## 8. Feature Spec 05 — Contribution Portfolio

进入 Contributions 自动给推荐：CORE / SUPPORTING / RESERVE；RESERVE 不进入正式内容，EXCLUDED 仅属于分析结果。展示为什么选/不选、证明责任、边际价值、重复、证据与事实风险、篇幅成本，不按单一相似度选 Top N。

用户可 Add / Remove / Replace / Promote / Demote，查看所有资产；调整后刷新 Coverage、Redundancy、Fact Risk、Budget，给替代候选但不擅自移除用户选择。已存在 Master 时优先作为起点并显示轻量差异。

每个 Item 关联 Proof Responsibilities 与 Planned Fact Revisions。确认审计区显示组合、覆盖、接受缺口、关键事实风险、冗余、预算；真实 Gap 可接受。高风险未解决的 Planned Fact 必须处理或取消使用，不牵连未选事实。

Confirm 形成不可静默覆盖的快照；再改创建新版本，仅提示和更新受影响 Resume Items。此页不生成最终 Bullet。

验收：移除支撑项能看到 Coverage 损失；未计划使用的 UNCERTAIN 不阻塞；危险 Planned Fact 阻塞；确认后重分析不改阵容。

## 9. Feature Spec 06 — Resume Content Workspace

Confirmed Portfolio → 自动内容计划及完整初稿，无额外计划确认关卡。预算默认 STANDARD 6 bullets；COMPACT 4–5、DETAILED 7–8，不估算外部排版行高。

编辑单位为 Content Item，保存贡献、Fact Revision、Proof Requirement 及顺序。每条 Bullet 有主要证明责任。生成只使用允许事实；Use Different Facts 可从同一 Contribution 主动选择其他可信事实，验证并记录本版本授权，不修改已确认 Portfolio。

直接编辑及局部 AI Shorten / Rewrite / business / technical emphasis 只影响当前 Item。Pinned Facts 必须在措辞与引用中保留；事实变化、新 Claim 或无法判断进入 Review，允许更新 Career Fact、恢复、删 Claim，不得直接变成可交付内容。

Experience/Bullet 可排序；结构变化重新评估覆盖和预算，不强制接受推荐。上游变化按 Contribution / Fact 引用确定受影响范围，未影响内容保留。Skills / Education / Summary 轻量保存展示，事实性内容同样受溯源约束。

Clean Preview 隐藏内部标识和分析，支持 Copy Bullet / Experience / All。复制不等于确认；Mark Content Ready 检查通过才生成稳定快照，继续修改开新 Draft。

Direction Master / Specific Job 共用版本模型，支持从 Master 派生和 parent lineage；Master 不冒充真实 Job。版本比较包括 Contributions、Facts、文字与 Proof Coverage，不实现单句永久版本树。

验收：改 10% 为 15% 触发 Fact Review；虚构新规模无法直接交付；Pinned 不丢；复制不改状态；旧快照和未受影响 Item 保持不变。

## 10. Feature Spec 07 — Final / Library / Application

内容 Ready 后在外部排版，上传最终 PDF 绑定具体 Content Version；一个内容版本可有多个 Final 文件。显示名与原文件名分开，默认 Company · Role · Season · Version，可编辑内部显示名。

未使用 FINAL 可替换/删除；真实投递后用户 Mark as Applied，创建绑定具体文件的 Application 并冻结文件。USED 只能归档显示；修改 PDF 创建新记录。Application 记录日期、渠道、状态、结果、备注，允许同岗位多次投递；误建标 VOIDED，保留历史绑定。

Library 提供 Resume Versions / Final Resumes / Imported Files，后者复用 Evidence；支持搜索和方向、公司、状态、Season 筛选。Lineage 默认只展示内容版本，可展开 Final 和 Application，支持比较、从旧版创建、打开文件。

旧 Fact 被修订或撤回时派生 Historical Notice，旧文本/PDF 不变。MVP 上传不自动回读比对，仅要求用户确认最终文件；保存关联不等于证明外部 PDF 与内容逐字相同。

验收：同名 PDF 可按语义名找到；投递始终定位当时文件；归档/作废不解冻；版本谱系和事实来源可查。

## 11. 整体验收

使用非敏感演示材料完成空库导入 → 一段可信资产 → JD 分析 → 组合审核 → 内容确认 → 上传 PDF → 记录投递，能解释每个关键选择与事实来源。注入 AI 失败、非法结构输出、解析失败和重启中断后，已确认事实、快照、PDF 与投递绑定仍完整。逐 Task 的交付及测试要求以 WORK_MANUAL.md 为准。
