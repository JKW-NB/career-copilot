export type Verification = 'EVIDENCE_VERIFIED' | 'USER_CONFIRMED' | 'UNCERTAIN';
export type Role = 'CORE' | 'SUPPORTING' | 'RESERVE';
export type ProofId = 'ai' | 'data' | 'business' | 'industry';
export interface Fact {
  id: string; contributionId: string; text: string; verification: Verification;
  risk: 'LOW' | 'HIGH'; source: string; locator: string; snippet: string; proofs: ProofId[];
}
export interface Contribution {
  id: string; title: string; organization: string; project: string; period: string;
  category: string; summary: string; reason: string; tradeoff: string; facts: string[];
  color: 'sage' | 'clay' | 'blue' | 'sand';
}
export const job = {
  company: '星河科技', role: 'AI 产品实习生', location: '上海', season: '2026 秋季',
  direction: 'AI 产品方向',
  jd: '参与智能助手产品的需求分析和方案设计；与算法、研发同学协作，建立效果评估机制，推动产品体验迭代。通过用户反馈与数据分析识别产品机会。关注 AI 应用行业趋势，形成竞品研究和产品建议。',
};
export const requirements: { id: ProofId; title: string; subtitle: string; priority: string; quote: string; rationale: string }[] = [
  { id: 'ai', title: 'AI 产品与系统理解', subtitle: '理解 AI 能力，也理解产品边界', priority: '核心', quote: '参与智能助手产品的需求分析和方案设计', rationale: '需要具体参与过方案设计与效果验证。单纯使用 AI 工具，还不足以证明产品判断。' },
  { id: 'data', title: '用数据推动迭代', subtitle: '从评估方法走到可观察的结果', priority: '核心', quote: '建立效果评估机制，推动产品体验迭代', rationale: '评价指标、实验过程与结果要能串起来。多个贡献可以共同支撑这项证明责任。' },
  { id: 'business', title: '用户洞察与产品判断', subtitle: '把研究发现转化为产品建议', priority: '重要', quote: '通过用户反馈与数据分析识别产品机会', rationale: '研究样本与建议产出可以证明用户理解，但不能把“提出建议”写成“已带来业务增长”。' },
  { id: 'industry', title: 'AI 行业与竞品视野', subtitle: '展示对应用场景和行业变化的理解', priority: '辅助', quote: '关注 AI 应用行业趋势，形成竞品研究和产品建议', rationale: '当前主阵容缺少直接的行业研究材料。可加入竞品观察作为部分支撑，也可以如实保留缺口。' },
];
export const contributions: Contribution[] = [
  { id: 'agent', title: '智能助手方案与效果评估', organization: '青禾实验室', project: '知识助手探索', period: '2026.03 — 2026.07', category: 'AI / 产品设计', color: 'sage', summary: '围绕知识检索体验，设计助手交互方案，并用对照实验验证效果。', reason: '用真实的方案设计与实验过程，证明你对 AI 产品的理解。建议作为开篇核心经历。', tradeoff: '与评测实验项目有重叠，但产品方案和结果更完整。', facts: ['a1', 'a2', 'a3', 'a4'] },
  { id: 'research', title: '用户研究与需求优先级', organization: '向野创新工作室', project: '创作者工具研究', period: '2025.10 — 2026.02', category: '研究 / 商业判断', color: 'clay', summary: '从访谈和使用记录中整理痛点，形成可执行的需求建议。', reason: '补足用户视角，避免整份简历只有技术实验，没有需求和产品判断。', tradeoff: '有研究和建议证据，但尚无上线后的业务结果。', facts: ['r1', 'r2', 'r3'] },
  { id: 'pipeline', title: '反馈数据整理与自动化', organization: '青禾实验室', project: '知识助手探索', period: '2026.04 — 2026.07', category: '数据 / 效率工具', color: 'blue', summary: '整理用户反馈数据，建立可复用的分类和分析流程。', reason: '为数据能力提供补充证据，用较少篇幅说明执行能力。', tradeoff: '支持主叙事即可，不必占用过多简历篇幅。', facts: ['p1', 'p2'] },
  { id: 'insight', title: 'AI 应用竞品观察', organization: '独立研究项目', project: 'AI 应用观察手册', period: '2026.06 — 2026.08', category: '行业 / 竞品研究', color: 'sand', summary: '持续整理 AI 应用的交互模式与目标用户差异。', reason: '为行业视野提供部分支撑，可替换重复较高的辅助经历。', tradeoff: '只有观察笔记，缺少研究如何影响决策的证据，因此仍是部分覆盖。', facts: ['i1'] },
  { id: 'experiment', title: '检索策略对照实验', organization: '个人实验项目', project: '检索评估笔记', period: '2026.07 — 2026.08', category: 'AI / 实验方法', color: 'sage', summary: '比较不同检索设置在固定测试集上的表现。', reason: '可在希望突出技术实验时作为替代选项。', tradeoff: '与智能助手经历重合较多，新增证明责任有限。', facts: ['e1', 'e2'] },
];
export const facts: Fact[] = [
  { id: 'a1', contributionId: 'agent', text: '设计 3 套智能助手交互方案', verification: 'EVIDENCE_VERIFIED', risk: 'LOW', source: '助手方案记录.md', locator: '第二节 · 交互方案', snippet: '围绕不同检索场景，整理并设计了 3 套交互方案。', proofs: ['ai'] },
  { id: 'a2', contributionId: 'agent', text: '建立统一效果评估流程', verification: 'EVIDENCE_VERIFIED', risk: 'LOW', source: '效果评估说明.pdf', locator: '第 2 页', snippet: '使用相同的测试集与评分标准，对方案进行对照评估。', proofs: ['ai', 'data'] },
  { id: 'a3', contributionId: 'agent', text: '测试集回答准确率相对提升约 10%', verification: 'EVIDENCE_VERIFIED', risk: 'HIGH', source: '效果评估说明.pdf', locator: '第 4 页 · 实验结果', snippet: '固定测试集上的相对准确率提升约为 10%；该结果不代表线上业务增长。', proofs: ['data'] },
  { id: 'a4', contributionId: 'agent', text: '独立主导整个智能助手项目', verification: 'UNCERTAIN', risk: 'HIGH', source: '旧简历样例.pdf', locator: '项目经历', snippet: '旧简历中写为“独立主导”，原始项目记录尚未明确个人责任边界。', proofs: [] },
  { id: 'r1', contributionId: 'research', text: '完成 12 位目标用户的访谈整理', verification: 'EVIDENCE_VERIFIED', risk: 'LOW', source: '用户访谈汇总.docx', locator: '样本说明', snippet: '本轮研究覆盖 12 位目标用户，访谈记录已归档。', proofs: ['business'] },
  { id: 'r2', contributionId: 'research', text: '形成 4 项需求优先级建议', verification: 'USER_CONFIRMED', risk: 'LOW', source: '访谈确认片段', locator: '用户确认 · 第 2 条', snippet: '我把高频痛点整理成了 4 项建议，是否上线还不清楚。', proofs: ['business'] },
  { id: 'r3', contributionId: 'research', text: '建立用户反馈分类框架', verification: 'EVIDENCE_VERIFIED', risk: 'LOW', source: '研究分析笔记.md', locator: '第三节', snippet: '按使用场景、问题类型和频次建立反馈分类框架。', proofs: ['data'] },
  { id: 'p1', contributionId: 'pipeline', text: '使用 Python 整理用户反馈记录', verification: 'EVIDENCE_VERIFIED', risk: 'LOW', source: '数据流程说明.md', locator: '处理流程', snippet: '使用 Python 完成数据清理与格式统一。', proofs: ['data'] },
  { id: 'p2', contributionId: 'pipeline', text: '建立可复用的周报汇总流程', verification: 'USER_CONFIRMED', risk: 'LOW', source: '工作记录.txt', locator: '用户确认', snippet: '将分类结果整理为每周可重复使用的汇总流程。', proofs: [] },
  { id: 'i1', contributionId: 'insight', text: '整理 6 款 AI 应用的交互与用户定位差异', verification: 'EVIDENCE_VERIFIED', risk: 'LOW', source: '竞品观察笔记.md', locator: '对照表', snippet: '记录 6 款应用的目标用户和交互差异，尚未形成决策验证。', proofs: ['industry'] },
  { id: 'e1', contributionId: 'experiment', text: '完成不同检索设置的对照实验', verification: 'EVIDENCE_VERIFIED', risk: 'LOW', source: '实验记录.md', locator: '实验方法', snippet: '在固定测试集上比较不同检索设置。', proofs: ['ai'] },
  { id: 'e2', contributionId: 'experiment', text: '记录评测结果并整理实验结论', verification: 'USER_CONFIRMED', risk: 'LOW', source: '实验记录.md', locator: '结果整理', snippet: '整理每组设置的结果和观察结论，未声称业务效果。', proofs: ['data'] },
];
export const getFact = (id: string) => {
  const fact = facts.find(value => value.id === id);
  if (!fact) throw new Error(`未知事实：${id}`);
  return fact;
};
export const getContribution = (id: string) => {
  const contribution = contributions.find(value => value.id === id);
  if (!contribution) throw new Error(`未知贡献：${id}`);
  return contribution;
};
