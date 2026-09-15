# Career Copilot — Coding Agent 入口

注意事项·每次改动完成后，都必须创建一个对应的Git commit，以便后续追踪和回滚。每次改动后，都必须编写或更新相关测试，并在交付给用户前，确保所有测试和验证全部通过。

Career Copilot 同时是产品和学习主线。开始任何 Task 前依次读取 PRODUCT_SPEC.md、TECH_SPEC.md、WORK_MANUAL.md、IMPLEMENTATION_PLAN.md、LEARNING_MAP.md 与当前代码。每次只处理一个 Task，并严格执行 Learning Gate：先只读分析；识别并拆分稳定 Learning Parts；逐 Part 讲解、检查和批改。全部 Parts 通过后必须先执行 Learning Map Sync，把状态更新为“已完成本轮学习”，并将真实知识、JKai 已明确表达的理解和易混淆点补回 LEARNING_MAP.md 的原知识节点，然后停止。只有 JKai 明确说“可以开始实操”或“可以开始实现”，才允许修改实现文件。实现和验证完成后再次执行 Implementation Reflection，补充代码落点、实际设计、理由、确实讨论过的替代方案与 trade-off。未经 JKai 明确决定，不进入下一 Task，不自动连续推进，也不自动判定 JKai 已掌握。

以 WORK_MANUAL.md 的完成定义为准。一次完整、独立可验证的改动对应一个 commit；不是每次保存文件都提交。失败检查不得跳过或宣称通过；修复后再提交。不得夹带其他人的未提交改动，不自动推送远程。

面向用户使用中文，称呼 JKai。仓库已有 Tauri 桌面壳、SQLite Storage 基础设施与内存交互 Demo；M0-T1、M0-T2 保留为学习和 Implementation Reflection 材料。M0-T1 已完成 16/16 学习及两次同步闭环；M0-T2 暂停在 1/14，未经 JKai 确认不得继续其学习，更不得进入 M0-T3 开发。不要把演示或计划中的功能当作正式实现。
