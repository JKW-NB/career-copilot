# Career Copilot — Coding Agent 入口

注意事项·每次改动完成后，都必须创建一个对应的Git commit，以便后续追踪和回滚。每次改动后，都必须编写或更新相关测试，并在交付给用户前，确保所有测试和验证全部通过。

Career Copilot 同时是产品和学习主线。开始任何 Task 前依次读取 PRODUCT_SPEC.md、TECH_SPEC.md、WORK_MANUAL.md、IMPLEMENTATION_PLAN.md、LEARNING_MAP.md 与当前代码。每次只处理一个 Task，并严格执行 Learning Gate：先只读分析；识别并讲解核心知识、必要性、不采用的后果、相近概念区别及当前代码落点；讲完立即停止。只有 JKai 在讨论后明确说“可以开始实现”，才允许修改任何文件。实现和验证完成后复盘代码落点、设计理由、替代方案与 trade-off，并把知识补回 LEARNING_MAP.md 的原知识节点。未经 JKai 明确决定，不进入下一 Task，不自动连续推进，也不自动判定 JKai 已掌握。

以 WORK_MANUAL.md 的完成定义为准。一次完整、独立可验证的改动对应一个 commit；不是每次保存文件都提交。失败检查不得跳过或宣称通过；修复后再提交。不得夹带其他人的未提交改动，不自动推送远程。

面向用户使用中文，称呼 JKai。仓库已有 Tauri 桌面壳、SQLite Storage 基础设施与内存交互 Demo；M0-T1、M0-T2 保留为学习材料。当前开发暂停，从 M0-T1 开始系统学习；不得自行进入 M0-T2 学习或 M0-T3 开发。不要把演示或计划中的功能当作正式实现。
