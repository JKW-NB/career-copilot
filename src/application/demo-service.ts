import { contributions, facts, getContribution, getFact, job, requirements, type Role } from '../demo/fixtures';

export interface PortfolioItem { contributionId: string; role: Role; factIds: string[] }
export interface Requirement { id: string; title: string; subtitle: string; priority: string; quote: string; rationale: string; included: boolean }
export interface AssetDraft { id: string; title: string; organization: string; summary: string }
export type WorkspaceAction = { kind: 'add'; title: string; organization: string; summary: string } | { kind: 'edit' | 'delete'; id: string; before: string; summary: string } | { kind: 'remove'; id: string; before: string };
export interface Proposal { id: string; action: WorkspaceAction; status: 'pending' | 'applied' | 'dismissed' }
export interface PortfolioSnapshot { version: number; items: PortfolioItem[]; requirements: Requirement[] }
export type RewriteStyle = 'standard' | 'compact' | 'business' | 'technical';
export interface ContentItem { id: string; contributionId: string; factIds: string[]; pinned: string[]; text: string; style: RewriteStyle }
export interface Content { basedOnVersion: number; sourceItems: PortfolioItem[]; items: ContentItem[] }
export interface ReadyContent extends Content { version: number }
export interface FinalSample { id: string; name: string; contentVersion: number; status: 'FINAL' | 'USED' | 'ARCHIVED'; used: boolean }
export interface DemoState {
  assetDrafts: AssetDraft[]; requirements: Requirement[]; proposals: Proposal[]; sequence: number;
  portfolio: PortfolioItem[]; confirmed: PortfolioSnapshot | null; content: Content | null;
  pendingEdit: { itemId: string; text: string } | null; ready: ReadyContent[]; files: FinalSample[];
}
const safeFacts = (id: string) => getContribution(id).facts.filter(factId => getFact(factId).verification !== 'UNCERTAIN');
const initial = (): DemoState => ({
  assetDrafts: [], requirements: requirements.map(item => ({ ...item, included: true })), proposals: [], sequence: 0,
  portfolio: ['agent', 'research', 'pipeline'].map((contributionId, i) => ({ contributionId, role: i < 2 ? 'CORE' : 'SUPPORTING', factIds: safeFacts(contributionId) })),
  confirmed: null, content: null, pendingEdit: null, ready: [], files: [],
});
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
const signature = (items: PortfolioItem[]) => JSON.stringify(items);
const active = (items: PortfolioItem[]) => items.filter(item => item.role !== 'RESERVE');
export const portfolioChanged = (state: DemoState) => !state.confirmed || signature(state.portfolio) !== signature(state.confirmed.items) || JSON.stringify(state.requirements) !== JSON.stringify(state.confirmed.requirements);
export function coverage(items: PortfolioItem[], proofRequirements: readonly { id: string; title: string; subtitle: string; priority: string; quote: string; rationale: string; included?: boolean }[] = requirements) {
  return proofRequirements.filter(proof => proof.included !== false).map(proof => {
    const supporting = active(items).flatMap(item => item.factIds.map(getFact)).filter(fact => fact.verification !== 'UNCERTAIN' && fact.proofs.some(id => id === proof.id));
    return { ...proof, factIds: supporting.map(fact => fact.id), contributionIds: [...new Set(supporting.map(fact => fact.contributionId))], status: (supporting.length >= 2 ? 'COVERED' : supporting.length ? 'PARTIAL' : 'GAP') as 'COVERED' | 'PARTIAL' | 'GAP' };
  });
}
export const riskyFacts = (items: PortfolioItem[]) => active(items).flatMap(item => item.factIds.map(getFact)).filter(fact => fact.verification === 'UNCERTAIN');
export function affectedContributions(state: DemoState): string[] {
  if (!state.content || !state.confirmed) return [];
  const before = active(state.content.sourceItems); const after = active(state.confirmed.items);
  return [...new Set([...before, ...after].map(item => item.contributionId))].filter(id =>
    JSON.stringify(before.find(item => item.contributionId === id)) !== JSON.stringify(after.find(item => item.contributionId === id)));
}
export function compose(factIds: string[], style: RewriteStyle): string {
  const selected = factIds.map(getFact);
  if (style === 'technical') selected.sort((a, b) => Number(b.proofs.includes('data')) - Number(a.proofs.includes('data')));
  if (style === 'business') selected.sort((a, b) => Number(b.proofs.includes('business')) - Number(a.proofs.includes('business')));
  return selected.map(fact => fact.text).join(style === 'compact' ? '；' : '，') + '。';
}
function compileItem(item: PortfolioItem): ContentItem {
  return { id: `content-${item.contributionId}`, contributionId: item.contributionId, factIds: [...item.factIds], pinned: [], text: compose(item.factIds, 'standard'), style: 'standard' };
}
export function createDemoService() {
  let state = freeze(initial());
  const listeners = new Set<() => void>();
  const publish = (next: DemoState) => { state = freeze(next); listeners.forEach(listener => listener()); };
  const change = (update: (next: DemoState) => void) => {
    const next = structuredClone(state); update(next); publish(next);
  };
  const findPortfolio = (next: DemoState, id: string) => {
    const item = next.portfolio.find(item => item.contributionId === id);
    if (!item) throw new Error('请先把这项贡献加入组合。');
    return item;
  };
  const findContent = (next: DemoState, id: string) => {
    const item = next.content?.items.find(item => item.id === id);
    if (!item) throw new Error('请先生成简历内容。');
    return item;
  };
  const requireConfirmed = () => {
    if (portfolioChanged(state)) throw new Error('请先确认当前组合，再继续生成或更新内容。');
    return state.confirmed!;
  };
  const addDraft = (next: DemoState, input: { title: string; organization: string; summary: string }) => {
    if (!input.title.trim() || !input.summary.trim()) throw new Error('请填写资产名称与经历描述。');
    next.assetDrafts.push({ id: `draft-${++next.sequence}`, title: input.title.trim(), organization: input.organization.trim(), summary: input.summary.trim() });
  };
  return {
    addAssetDraft: (input: { title: string; organization: string; summary: string }) => change(next => addDraft(next, input)),
    updateRequirement: (id: string, update: { included?: boolean; priority?: string }) => change(next => {
      const proof = next.requirements.find(item => item.id === id);
      if (!proof) throw new Error('没有找到该能力要求。');
      if (update.priority && !['核心', '重要', '辅助'].includes(update.priority)) throw new Error('重要性无效。');
      Object.assign(proof, update);
    }),
    addRequirement: (title: string, rationale: string, priority: string) => change(next => {
      if (!title.trim() || !rationale.trim()) throw new Error('请填写能力名称与说明。');
      if (!['核心', '重要', '辅助'].includes(priority)) throw new Error('重要性无效。');
      next.requirements.push({ id: `custom-${++next.sequence}`, title: title.trim(), rationale: rationale.trim(), subtitle: '用户补充', quote: '用户补充要求，并非岗位原文。', priority, included: true });
    }),
    propose: (action: WorkspaceAction) => { let id = ''; change(next => { id = `proposal-${++next.sequence}`; next.proposals.push({ id, action, status: 'pending' }); }); return id; },
    dismissProposal: (id: string) => change(next => { const proposal = next.proposals.find(item => item.id === id); if (proposal?.status === 'pending') proposal.status = 'dismissed'; }),
    applyProposal: (id: string) => change(next => {
      const proposal = next.proposals.find(item => item.id === id);
      if (!proposal || proposal.status !== 'pending') throw new Error('该建议已处理或不存在。');
      const action = proposal.action;
      if (action.kind === 'add') addDraft(next, action);
      else if (action.kind === 'remove') {
        const item = next.portfolio.find(item => item.contributionId === action.id);
        if (!item || JSON.stringify(item) !== action.before) throw new Error('组合已变化，请重新生成建议。');
        next.portfolio = next.portfolio.filter(item => item.contributionId !== action.id);
      } else {
        const draft = next.assetDrafts.find(item => item.id === action.id);
        if (!draft || JSON.stringify(draft) !== action.before) throw new Error('资产草稿已变化，请重新生成建议。');
        if (action.kind === 'delete') next.assetDrafts = next.assetDrafts.filter(item => item.id !== action.id);
        else { if (!action.summary.trim()) throw new Error('描述不能为空。'); draft.summary = action.summary.trim(); }
      }
      proposal.status = 'applied';
    }),
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    reset: () => publish(initial()),
    addContribution: (id: string) => change(next => {
      getContribution(id);
      if (next.portfolio.some(item => item.contributionId === id)) throw new Error('该贡献已经在组合中。');
      next.portfolio.push({ contributionId: id, role: 'SUPPORTING', factIds: safeFacts(id) });
    }),
    removeContribution: (id: string) => change(next => { next.portfolio = next.portfolio.filter(item => item.contributionId !== id); }),
    replaceContribution: (oldId: string, newId: string) => change(next => {
      const item = findPortfolio(next, oldId); getContribution(newId);
      if (next.portfolio.some(item => item.contributionId === newId)) throw new Error('替换项已经在组合中。');
      item.contributionId = newId; item.factIds = safeFacts(newId);
    }),
    setRole: (id: string, role: Role) => change(next => { findPortfolio(next, id).role = role; }),
    toggleFact: (id: string, factId: string) => change(next => {
      const item = findPortfolio(next, id);
      if (getFact(factId).contributionId !== id) throw new Error('事实不属于当前贡献。');
      item.factIds = item.factIds.includes(factId) ? item.factIds.filter(value => value !== factId) : [...item.factIds, factId];
    }),
    confirmPortfolio: () => {
      if (!active(state.portfolio).length) throw new Error('至少选择一项实际用于简历的贡献。');
      if (riskyFacts(state.portfolio).length) throw new Error('组合包含未确认的事实，请取消使用或先完成事实审查。');
      for (const item of active(state.portfolio)) {
        if (!item.factIds.length) throw new Error('每项入选贡献至少选择一条可信事实。');
        if (!item.factIds.some(id => getFact(id).proofs.length)) throw new Error('入选贡献需要有明确的证明责任。');
      }
      if (!portfolioChanged(state)) return;
      change(next => { next.confirmed = { version: (next.confirmed?.version ?? 0) + 1, items: structuredClone(next.portfolio), requirements: structuredClone(next.requirements) }; });
    },
    generateContent: () => {
      const confirmed = requireConfirmed();
      if (state.content) throw new Error('已有工作内容，请使用“更新受影响内容”，以保留局部修改。');
      change(next => { next.content = { basedOnVersion: confirmed.version, sourceItems: structuredClone(confirmed.items), items: active(confirmed.items).map(compileItem) }; });
    },
    updateAffected: () => {
      const confirmed = requireConfirmed();
      if (state.pendingEdit) throw new Error('请先处理当前文字的事实审查。');
      const affected = affectedContributions(state);
      const incoming = active(confirmed.items);
      for (const item of state.content?.items ?? []) {
        const replacement = incoming.find(p => p.contributionId === item.contributionId);
        if (affected.includes(item.contributionId) && item.pinned.some(id => !replacement?.factIds.includes(id))) throw new Error('上游变化会移除固定事实，请先取消相应固定，再更新内容。');
      }
      change(next => {
        const old = next.content?.items ?? [];
        next.content = { basedOnVersion: confirmed.version, sourceItems: structuredClone(confirmed.items), items: incoming.map(item => {
          const previous = old.find(oldItem => oldItem.contributionId === item.contributionId);
          if (previous && !affected.includes(item.contributionId)) return previous;
          const compiled = compileItem(item);
          if (previous) compiled.pinned = previous.pinned.filter(id => compiled.factIds.includes(id));
          return compiled;
        }) };
      });
    },
    rewrite: (id: string, style: RewriteStyle) => change(next => {
      if (next.pendingEdit) throw new Error('请先处理待审查文字。');
      const item = findContent(next, id); item.style = style; item.text = compose(item.factIds, style);
    }),
    editContent: (id: string, text: string) => change(next => {
      const item = findContent(next, id);
      if (!text.trim()) throw new Error('内容不能为空。');
      if (text === item.text) return;
      const known = (['standard', 'compact', 'business', 'technical'] as RewriteStyle[]).some(style => compose(item.factIds, style) === text.trim());
      if (known) { item.text = text.trim(); next.pendingEdit = null; }
      else next.pendingEdit = { itemId: id, text };
    }),
    dismissEdit: () => change(next => { next.pendingEdit = null; }),
    pinFact: (id: string, factId: string) => change(next => {
      const item = findContent(next, id);
      if (!item.factIds.includes(factId)) throw new Error('只能固定正在使用的事实。');
      item.pinned = item.pinned.includes(factId) ? item.pinned.filter(value => value !== factId) : [...item.pinned, factId];
    }),
    swapContentFact: (id: string, factId: string) => change(next => {
      if (next.pendingEdit) throw new Error('请先处理待审查文字。');
      const item = findContent(next, id); const fact = getFact(factId);
      if (fact.contributionId !== item.contributionId) throw new Error('事实不属于当前贡献。');
      if (fact.verification === 'UNCERTAIN') throw new Error('该事实未确认，不能用于简历。');
      if (item.pinned.includes(factId)) throw new Error('请先取消固定这条事实。');
      const nextIds = item.factIds.includes(factId) ? item.factIds.filter(value => value !== factId) : [...item.factIds, factId];
      if (!nextIds.length) throw new Error('至少保留一条可信事实。');
      item.factIds = nextIds; item.text = compose(item.factIds, item.style);
    }),
    moveContent: (id: string, direction: -1 | 1) => change(next => {
      if (!next.content) return;
      const items = next.content.items; const index = items.findIndex(item => item.id === id);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= items.length) return;
      [items[index], items[destination]] = [items[destination], items[index]];
    }),
    markReady: () => {
      requireConfirmed();
      if (!state.content) throw new Error('请先生成内容。');
      if (state.pendingEdit) throw new Error('还有文字等待事实审查。');
      if (state.content.basedOnVersion !== state.confirmed!.version) throw new Error('请先更新受影响内容。');
      for (const item of state.content.items) {
        if (item.factIds.some(id => getFact(id).verification === 'UNCERTAIN')) throw new Error('内容包含未确认事实。');
      }
      const latest = state.ready.at(-1);
      if (latest && JSON.stringify(latest.items) === JSON.stringify(state.content.items) && latest.basedOnVersion === state.content.basedOnVersion) return;
      change(next => { next.ready.push({ ...structuredClone(next.content!), version: next.ready.length + 1 }); });
    },
    saveFinalSample: () => change(next => {
      const ready = next.ready.at(-1);
      if (!ready) throw new Error('请先把内容标记为 Ready。');
      next.files.push({ id: `file-${next.files.length + 1}`, name: `${job.company} · ${job.role} · ${job.season} · V${next.files.length + 1}`, contentVersion: ready.version, status: 'FINAL', used: false });
    }),
    markApplied: (id: string) => change(next => {
      const file = next.files.find(file => file.id === id);
      if (!file) throw new Error('没有找到该样例文件。');
      file.used = true; file.status = 'USED';
    }),
    archiveFinal: (id: string) => change(next => {
      const file = next.files.find(file => file.id === id);
      if (!file) throw new Error('没有找到该样例文件。');
      file.status = 'ARCHIVED';
    }),
    replaceFinal: (id: string) => change(next => {
      const file = next.files.find(file => file.id === id);
      if (!file) throw new Error('没有找到该样例文件。');
      if (file.used) throw new Error('此样例已使用并永久冻结，归档也不能替换。');
      const ready = next.ready.at(-1);
      if (!ready) throw new Error('请先确认内容。');
      file.contentVersion = ready.version;
    }),
  };
}
export type DemoService = ReturnType<typeof createDemoService>;
export const demoCatalog = { contributions, facts, requirements };
