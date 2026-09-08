import { it, expect } from 'vitest';
import { createDemoService, compose } from './demo-service';
import { assistantTargets, mockSuggestion } from './assistant-context';

it('captures the current target text and marks strategy edits as requiring reconfirmation', () => {
  const service = createDemoService();
  service.confirmPortfolio();
  const original = service.getSnapshot().confirmed;
  const target = assistantTargets(service.getSnapshot(), 'job', 'strategy')[0];
  const suggestion = mockSuggestion(service.getSnapshot(), target, '改为：说明具体方案设计与评估过程');
  const id = service.propose(suggestion.action);
  service.applyProposal(id);
  expect(service.getSnapshot().requirements[0].rationale).toBe('说明具体方案设计与评估过程');
  expect(service.getSnapshot().confirmed).toEqual(original);
  expect(() => service.generateContent()).toThrow('确认');
  service.undoLastProposal();
  expect(service.getSnapshot().requirements).toEqual(original!.requirements);
});

it('removes only a selected working contribution and can restore it', () => {
  const service = createDemoService();
  const original = service.getSnapshot().portfolio;
  const target = assistantTargets(service.getSnapshot(), 'job', 'portfolio')[1];
  const suggestion = mockSuggestion(service.getSnapshot(), target, '请移除这项贡献');
  const id = service.propose(suggestion.action);
  service.applyProposal(id);
  expect(service.getSnapshot().portfolio.map(item => item.contributionId)).toEqual(['agent', 'pipeline']);
  service.undoLastProposal();
  expect(service.getSnapshot().portfolio).toEqual(original);
});

it('applies a preview to the specified bullet and undo preserves historical versions', () => {
  const service = createDemoService();
  service.confirmPortfolio(); service.generateContent(); service.markReady();
  const original = service.getSnapshot();
  const bullet = original.content!.items[0];
  const text = compose(bullet.factIds, 'compact');
  const id = service.propose({ kind: 'field', target: { type: 'bullet', id: bullet.id }, before: bullet.text, text });
  expect(service.getSnapshot().content).toEqual(original.content);
  service.applyProposal(id);
  expect(service.getSnapshot().content!.items[0].text).toBe(text);
  expect(service.getSnapshot().content!.items[1]).toEqual(original.content!.items[1]);
  service.markReady();
  const history = service.getSnapshot().ready;
  service.undoLastProposal();
  expect(service.getSnapshot().content).toEqual(original.content);
  expect(service.getSnapshot().ready).toEqual(history);
  expect(service.getSnapshot().proposals[0].status).toBe('undone');
});

it('rejects changed targets and invented metrics without publishing partial writes', () => {
  const service = createDemoService();
  service.confirmPortfolio(); service.generateContent();
  const bullet = service.getSnapshot().content!.items[0];
  const stale = service.propose({ kind: 'field', target: { type: 'bullet', id: bullet.id }, before: '旧值不匹配', text: bullet.text });
  expect(() => service.applyProposal(stale)).toThrow('已变化');
  const unsafe = service.propose({ kind: 'field', target: { type: 'bullet', id: bullet.id }, before: bullet.text, text: bullet.text.replace('10%', '50%') });
  const before = service.getSnapshot();
  expect(() => service.applyProposal(unsafe)).toThrow('事实');
  expect(service.getSnapshot()).toBe(before);
});

it('updates and undoes project descriptions without altering facts or portfolio', () => {
  const service = createDemoService();
  const before = service.getSnapshot();
  const id = service.propose({ kind: 'field', target: { type: 'description', id: 'agent' }, before: before.descriptions.agent, text: '项目概述：' + before.descriptions.agent });
  service.applyProposal(id);
  expect(service.getSnapshot().descriptions.agent).toContain('项目概述');
  expect(service.getSnapshot().portfolio).toEqual(before.portfolio);
  service.undoLastProposal();
  expect(service.getSnapshot().descriptions).toEqual(before.descriptions);
});

it('undo refuses to overwrite subsequent changes to affected data', () => {
  const service = createDemoService();
  const id = service.propose({ kind: 'add', title: 'A', summary: '描述', organization: '' });
  service.applyProposal(id);
  service.addAssetDraft({ title: 'B', summary: '后续描述', organization: '' });
  expect(() => service.undoLastProposal()).toThrow('后续修改');
  expect(service.getSnapshot().assetDrafts).toHaveLength(2);
});
