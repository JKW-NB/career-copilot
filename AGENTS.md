# Career Copilot — Coding Agent 入口

注意事项·每次改动完成后，都必须创建一个对应的Git commit，以便后续追踪和回滚。每次改动后，都必须编写或更新相关测试，并在交付给用户前，确保所有测试和验证全部通过。

开始任务前依次读取 PRODUCT_SPEC.md、TECH_SPEC.md、WORK_MANUAL.md、IMPLEMENTATION_PLAN.md、LEARNING_MAP.md 中当前 Task 的映射，并检查当前代码和 Git 状态。每次只执行一个 Task，严格遵守“先讲解 → 再实操 → 后复盘并写入”：任何代码或业务文档修改前，先向 JKai 简单介绍对应概念及其在 Career Copilot 中的作用；完成实现和验证后，再用实际代码与测试复盘，并把记录写入 LEARNING_MAP.md。普通实现细节自主决定，重大产品、范围、隐私或架构变化先提出具体方案。

以 WORK_MANUAL.md 的完成定义为准。一次完整、独立可验证的改动对应一个 commit；不是每次保存文件都提交。失败检查不得跳过或宣称通过；修复后再提交。不得夹带其他人的未提交改动，不自动推送远程。

面向用户使用中文，称呼 JKai。仓库已有 Tauri 桌面壳与内存交互 Demo；持久化和真实 AI 尚待实施。不要把演示或计划中的功能当作正式实现。
