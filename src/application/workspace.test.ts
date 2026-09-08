import { describe, it, expect } from 'vitest';
import { createDemoService, coverage, portfolioChanged } from './demo-service';

describe('editable demo workspace', () => {
  it('keeps asset descriptions in drafts and resets independently', () => {
    const a = createDemoService(); const b = createDemoService();
    expect(() => a.addAssetDraft({ title: ' ', organization: '', summary: 'x' })).toThrow();
    a.addAssetDraft({ title: '研究项目', organization: '学校', summary: '整理研究资料' });
    expect(a.getSnapshot().assetDrafts).toHaveLength(1);
    expect(a.getSnapshot().portfolio).toEqual(b.getSnapshot().portfolio);
    expect(b.getSnapshot().assetDrafts).toHaveLength(0);
    a.reset(); expect(a.getSnapshot().assetDrafts).toHaveLength(0);
  });
  it('excludes requirements from coverage without overwriting confirmed strategy or ready content', () => {
    const service = createDemoService();
    service.confirmPortfolio(); service.generateContent(); service.markReady();
    const previous = service.getSnapshot();
    service.updateRequirement('industry', { included: false, priority: '核心' });
    expect(coverage(service.getSnapshot().portfolio, service.getSnapshot().requirements)).toHaveLength(3);
    expect(portfolioChanged(service.getSnapshot())).toBe(true);
    expect(service.getSnapshot().confirmed).toEqual(previous.confirmed);
    expect(service.getSnapshot().ready).toEqual(previous.ready);
    expect(() => service.markReady()).toThrow('确认');
    service.confirmPortfolio();
    expect(service.getSnapshot().confirmed?.version).toBe(2);
    expect(previous.confirmed?.requirements.find(item => item.id === 'industry')?.included).toBe(true);
  });
  it('new requirements start as real gaps and reject invalid input', () => {
    const service = createDemoService();
    expect(() => service.addRequirement('', '说明', '核心')).toThrow();
    expect(() => service.addRequirement('沟通', '说明', '100')).toThrow();
    service.addRequirement('跨团队沟通', '说明协作行动', '重要');
    const last = coverage(service.getSnapshot().portfolio, service.getSnapshot().requirements).at(-1);
    expect(last?.status).toBe('GAP'); expect(last?.factIds).toEqual([]);
  });
  it('does not apply proposals automatically and supports dismissal and single application', () => {
    const service = createDemoService();
    const action = { kind: 'add' as const, title: '项目', organization: '', summary: '原始描述' };
    const dismissed = service.propose(action);
    expect(service.getSnapshot().assetDrafts).toHaveLength(0);
    service.dismissProposal(dismissed);
    expect(() => service.applyProposal(dismissed)).toThrow();
    const accepted = service.propose(action); service.applyProposal(accepted);
    expect(service.getSnapshot().assetDrafts).toHaveLength(1);
    expect(() => service.applyProposal(accepted)).toThrow();
  });
  it('rejects stale edits atomically and permits explicit draft deletion', () => {
    const service = createDemoService();
    service.addAssetDraft({ title: '项目', organization: '', summary: '原描述' });
    const draft = service.getSnapshot().assetDrafts[0];
    const action = { kind: 'edit' as const, id: draft.id, before: JSON.stringify(draft), summary: '修改描述' };
    const first = service.propose(action); const stale = service.propose(action);
    service.applyProposal(first);
    const before = service.getSnapshot();
    expect(() => service.applyProposal(stale)).toThrow('已变化');
    expect(service.getSnapshot()).toBe(before);
    const updated = service.getSnapshot().assetDrafts[0];
    const deletion = service.propose({ kind: 'delete', id: updated.id, before: JSON.stringify(updated), summary: '' });
    service.applyProposal(deletion); expect(service.getSnapshot().assetDrafts).toHaveLength(0);
  });
  it('assistant removal only changes working portfolio and cannot mutate history', () => {
    const service = createDemoService();
    service.confirmPortfolio(); service.generateContent(); service.markReady();
    const previous = service.getSnapshot();
    const item = previous.portfolio[0];
    const id = service.propose({ kind: 'remove', id: item.contributionId, before: JSON.stringify(item) });
    service.applyProposal(id);
    expect(service.getSnapshot().portfolio).toHaveLength(2);
    expect(service.getSnapshot().confirmed).toEqual(previous.confirmed);
    expect(service.getSnapshot().ready).toEqual(previous.ready);
  });
});
