# Career Copilot — Coding Agent 入口

## 当前执行模式（2026-10-26）

JKai 已明确将首要目标调整为尽快交付能辅助求职、可放入作品集的产品，并授权按现有计划连续实施。当前采用交付优先模式：不以逐 Part 学习、理解检查、Learning Map Sync 或逐 Task 再授权阻塞开发；实现、测试、必要文档和对应 Git commit 仍必须完成。以下 Learning Gate 保留为以后用户明确恢复学习模式时的流程。知识地图不得因为代码完成而自动标记用户已学习或掌握。允许沿主线连续推进，不扩大冻结 MVP 范围，不自动推送远程。

注意事项·每次改动完成后，都必须创建一个对应的Git commit，以便后续追踪和回滚。每次改动后，都必须编写或更新相关测试，并在交付给用户前，确保所有测试和验证全部通过。

Career Copilot 同时是产品和学习主线。开始任何 Task 前依次读取 PRODUCT_SPEC.md、TECH_SPEC.md、WORK_MANUAL.md、IMPLEMENTATION_PLAN.md、LEARNING_MAP.md 与当前代码。每次只处理一个 Task，并严格执行 Learning Gate：先只读分析；识别并拆分稳定 Learning Parts；逐 Part 讲解、检查和批改。全部 Parts 通过后必须先执行 Learning Map Sync，把状态更新为“已完成本轮学习”，并将真实知识、JKai 已明确表达的理解和易混淆点补回 LEARNING_MAP.md 的原知识节点，然后停止。只有 JKai 明确说“可以开始实操”或“可以开始实现”，才允许修改实现文件。实现和验证完成后再次执行 Implementation Reflection，补充代码落点、实际设计、理由、确实讨论过的替代方案与 trade-off。未经 JKai 明确决定，不进入下一 Task，不自动连续推进，也不自动判定 JKai 已掌握。

以 WORK_MANUAL.md 的完成定义为准。一次完整、独立可验证的改动对应一个 commit；不是每次保存文件都提交。失败检查不得跳过或宣称通过；修复后再提交。不得夹带其他人的未提交改动，不自动推送远程。

面向用户使用中文，称呼 JKai。仓库已有桌面个人工作区和独立内存 Demo。当前按交付优先模式推进 M0-T3 及求职纵向切片；不自动增加用户学习进度。个人工作区通过受信任命令保存真实记录，Demo 不能当作真实 AI、解析或投递。M0-T4 的外部模型联网写入曾被自动审批拒绝：在获得明确数据发送授权前保持未接入，不绕过拒绝。
