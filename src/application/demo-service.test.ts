import { describe, expect, it } from 'vitest';
import { createDemoService, coverage, portfolioChanged, affectedContributions } from './demo-service';

describe('demo application behavior', () => {
  it('removing the research contribution visibly loses business coverage', () => {
    const app = createDemoService();
    expect(coverage(app.getSnapshot().portfolio).find(p => p.id === 'business')?.status).toBe('COVERED');
    app.removeContribution('research');
    expect(coverage(app.getSnapshot().portfolio).find(p => p.id === 'business')?.status).toBe('GAP');
  });
  it('an unselected uncertain fact does not block, but a planned one blocks confirmation', () => {
    const app = createDemoService();
    app.confirmPortfolio();
    const confirmed = app.getSnapshot().confirmed;
    app.toggleFact('agent', 'a4');
    expect(() => app.confirmPortfolio()).toThrow('未确认');
    expect(app.getSnapshot().confirmed).toEqual(confirmed);
    app.toggleFact('agent', 'a4');
    expect(() => app.confirmPortfolio()).not.toThrow();
  });
  it('rejects fact IDs from a different contribution', () => {
    const app = createDemoService();
    expect(() => app.toggleFact('agent', 'r1')).toThrow('不属于');
  });
  it('keeps confirmed snapshots frozen when editing a working portfolio', () => {
    const app = createDemoService();
    app.confirmPortfolio();
    const snapshot = app.getSnapshot().confirmed!;
    app.removeContribution('research');
    expect(snapshot.items.some(item => item.contributionId === 'research')).toBe(true);
    expect(portfolioChanged(app.getSnapshot())).toBe(true);
    expect(() => snapshot.items.pop()).toThrow();
  });
  it('requires confirmation before compilation and marks reserves as unused', () => {
    const app = createDemoService();
    expect(() => app.generateContent()).toThrow('确认');
    app.setRole('pipeline', 'RESERVE');
    app.confirmPortfolio(); app.generateContent();
    expect(app.getSnapshot().content!.items.map(item => item.contributionId)).not.toContain('pipeline');
  });
  it('does not save a changed metric or mark content ready while review is pending', () => {
    const app = createDemoService(); app.confirmPortfolio(); app.generateContent();
    const item = app.getSnapshot().content!.items[0];
    app.editContent(item.id, item.text.replace('10%', '15%'));
    expect(app.getSnapshot().pendingEdit?.text).toContain('15%');
    expect(app.getSnapshot().content!.items[0].text).toContain('10%');
    expect(() => app.markReady()).toThrow('审查');
    app.dismissEdit(); app.markReady();
    expect(app.getSnapshot().ready).toHaveLength(1);
  });
  it('treats non-template new claims as review, even without changed numbers', () => {
    const app = createDemoService(); app.confirmPortfolio(); app.generateContent();
    const item = app.getSnapshot().content!.items[0];
    app.editContent(item.id, `${item.text}，推动产品全面上线`);
    expect(app.getSnapshot().pendingEdit).not.toBeNull();
  });
  it('preserves pinned facts through rewrite and refuses removing them', () => {
    const app = createDemoService(); app.confirmPortfolio(); app.generateContent();
    const item = app.getSnapshot().content!.items[0];
    app.pinFact(item.id, 'a3'); app.rewrite(item.id, 'compact');
    expect(app.getSnapshot().content!.items[0].text).toContain('10%');
    expect(() => app.swapContentFact(item.id, 'a3')).toThrow('固定');
  });
  it('updates affected contributions only and preserves untouched edits/pins', () => {
    const app = createDemoService(); app.confirmPortfolio(); app.generateContent();
    const agent = app.getSnapshot().content!.items[0];
    app.rewrite(agent.id, 'technical'); app.pinFact(agent.id, 'a3');
    const before = structuredClone(app.getSnapshot().content!.items[0]);
    app.replaceContribution('research', 'insight'); app.confirmPortfolio();
    expect(affectedContributions(app.getSnapshot())).toEqual(expect.arrayContaining(['research', 'insight']));
    app.updateAffected();
    expect(app.getSnapshot().content!.items.find(item => item.id === agent.id)).toEqual(before);
    expect(app.getSnapshot().content!.items.some(item => item.contributionId === 'research')).toBe(false);
  });
  it('blocks removing a pinned fact through upstream changes until reviewed', () => {
    const app = createDemoService(); app.confirmPortfolio(); app.generateContent();
    const item = app.getSnapshot().content!.items[0];
    app.pinFact(item.id, 'a3'); app.toggleFact('agent', 'a3'); app.confirmPortfolio();
    expect(() => app.updateAffected()).toThrow('固定');
    app.pinFact(item.id, 'a3'); app.updateAffected();
    expect(app.getSnapshot().content!.items[0].factIds).not.toContain('a3');
  });
  it('keeps ready history and permanent sample-file lock after archive', () => {
    const app = createDemoService(); app.confirmPortfolio(); app.generateContent(); app.markReady();
    const readyText = app.getSnapshot().ready[0].items[0].text;
    app.saveFinalSample(); app.markApplied('file-1'); app.archiveFinal('file-1');
    expect(() => app.replaceFinal('file-1')).toThrow('冻结');
    app.rewrite(app.getSnapshot().content!.items[0].id, 'compact');
    expect(app.getSnapshot().ready[0].items[0].text).toBe(readyText);
  });
  it('reset restores clean fixtures without keeping user changes', () => {
    const app = createDemoService(); app.removeContribution('agent'); app.reset();
    expect(app.getSnapshot().portfolio).toHaveLength(3);
    expect(app.getSnapshot().confirmed).toBeNull();
  });
});
