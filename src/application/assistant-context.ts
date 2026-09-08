import { contributions, job } from '../demo/fixtures';
import { compose, type DemoState, type WorkspaceAction } from './demo-service';

export interface AssistantTarget { key: string; label: string; text: string; kind: 'description' | 'bullet' | 'requirement' | 'draft' | 'portfolio'; id: string }
export function assistantTargets(state: DemoState, page: string, tab: string): AssistantTarget[] {
  if (page === 'assets') return [
    ...state.assetDrafts.map(item => ({ key: 'draft:' + item.id, label: `${item.organization || '职业资产'} > ${item.title} > 经历描述`, text: item.summary, kind: 'draft' as const, id: item.id })),
    ...contributions.map(item => ({ key: 'description:' + item.id, label: `${item.organization} > ${item.title} > 项目描述`, text: state.descriptions[item.id], kind: 'description' as const, id: item.id })),
  ];
  if (page !== 'job') return [];
  if (tab === 'resume') return (state.content?.items ?? []).map(item => ({ key: 'bullet:' + item.id, label: `${job.company} > ${contributions.find(value => value.id === item.contributionId)!.title} > 简历 Bullet`, text: item.text, kind: 'bullet', id: item.id }));
  if (tab === 'strategy') return state.requirements.map(item => ({ key: 'requirement:' + item.id, label: `${job.company} > ${item.title} > 能力说明`, text: item.rationale, kind: 'requirement', id: item.id }));
  if (tab === 'portfolio') return state.portfolio.map(item => ({ key: 'portfolio:' + item.contributionId, label: `${job.company} > 当前组合 > ${contributions.find(value => value.id === item.contributionId)!.title}`, text: state.descriptions[item.contributionId], kind: 'portfolio', id: item.contributionId }));
  return [];
}

export function mockSuggestion(state: DemoState, target: AssistantTarget, request: string): { action: WorkspaceAction; after: string } {
  if (/删除|移除|移出/.test(request)) {
    if (target.kind === 'draft') {
      const draft = state.assetDrafts.find(item => item.id === target.id)!;
      return { action: { kind: 'delete', id: target.id, before: JSON.stringify(draft), summary: '' }, after: '删除这项未确认资产草稿。' };
    }
    if (target.kind === 'portfolio') return { action: { kind: 'remove', id: target.id, before: JSON.stringify(state.portfolio.find(item => item.contributionId === target.id)) }, after: '从当前组合移除；职业资产和历史版本保留。' };
    throw new Error('此目标不支持直接删除。可在贡献组合中移出经历，或修改当前文字。');
  }
  if (target.kind === 'portfolio') throw new Error('组合项可请求移除；修改描述请到职业资产，修改 Bullet 请到简历内容。');
  let after: string;
  if (target.kind === 'bullet') {
    const item = state.content!.items.find(item => item.id === target.id)!;
    after = compose(item.factIds, item.style === 'compact' ? 'standard' : 'compact');
  } else {
    const requested = request.match(/(?:改为|替换为|补充为)[：:]\s*([\s\S]+)/)?.[1]?.trim();
    after = requested || (target.text.includes('，') ? target.text.replaceAll('，', '；') : '内容概述：' + target.text);
  }
  if (after === target.text) throw new Error('当前文字已经符合该演示表达。可以用“改为：新描述”指定草稿或字段内容。');
  if (target.kind === 'draft') return { action: { kind: 'edit', id: target.id, before: JSON.stringify(state.assetDrafts.find(item => item.id === target.id)), summary: after }, after };
  return { action: { kind: 'field', target: { type: target.kind, id: target.id }, before: target.text, text: after }, after };
}
