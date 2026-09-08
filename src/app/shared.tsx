import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowUpRight, Check, CircleHelp, FileText, ShieldCheck, X } from 'lucide-react';
import { getContribution, getFact, type Fact } from '../demo/fixtures';
import { coverage, type DemoService, type DemoState } from '../application/demo-service';

export type Tab = 'strategy' | 'portfolio' | 'resume' | 'final';
export type Inspection = { kind: 'proof' | 'contribution' | 'fact'; id: string };
export interface PageProps {
  state: DemoState; service: DemoService; run: (action: () => void, message?: string) => boolean;
  inspect: (value: Inspection) => void; goTab: (tab: Tab) => void;
  askAssistant: (text: string, key?: string) => void; newAsset: () => void;
}
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'orange' | 'red' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-symbol"><FileText size={28} /></div><h2>{title}</h2><p>{children}</p>{action}</div>;
}
export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} onCancel={event => { event.preventDefault(); onClose(); }} aria-label={title}>
    <header className="modal-header"><h2>{title}</h2><button className="icon-button" aria-label="关闭弹窗" onClick={onClose}><X size={20} /></button></header>
    <div className="modal-body">{children}</div>
  </dialog>;
}
export function FactStatus({ fact }: { fact: Fact }) {
  return <Badge tone={fact.verification === 'UNCERTAIN' ? 'orange' : 'green'}>{fact.verification === 'EVIDENCE_VERIFIED' ? '证据已验证' : fact.verification === 'USER_CONFIRMED' ? '用户已确认' : '待确认'}</Badge>;
}
export const coverageLabel = { COVERED: '已覆盖', PARTIAL: '部分覆盖', GAP: '待补充' };
export function ContextPanel({ state, selection, inspect, askAssistant }: { state: DemoState; selection: Inspection; inspect: (selection: Inspection) => void; askAssistant: (text: string) => void }) {
  const currentCoverage = coverage(state.portfolio, state.requirements.map(item => ({ ...item, included: true })));
  const proof = selection.kind === 'proof' ? currentCoverage.find(proof => proof.id === selection.id) : undefined;
  const contribution = selection.kind === 'contribution' ? getContribution(selection.id) : undefined;
  const fact = selection.kind === 'fact' ? getFact(selection.id) : undefined;
  return <aside className="context-panel" aria-label="依据与上下文">
    <div className="context-label"><span><CircleHelp size={15} /> DECISION CONTEXT</span><span className="live-dot" /></div>
    <h3>{proof ? '为什么需要这项能力？' : contribution ? '为什么选择这段经历？' : '这条事实从哪里来？'}</h3>
    {proof && <>
      <div className="context-selected"><span className="eyebrow">当前证明责任</span><h4>{proof.title}</h4><Badge tone={proof.status === 'COVERED' ? 'green' : 'orange'}>{state.requirements.find(item => item.id === proof.id)?.included ? coverageLabel[proof.status] : '本次不纳入'}</Badge></div>
      <div className="context-section"><span className="section-overline">JD 原文依据</span><blockquote>“{proof.quote}”</blockquote></div>
      <div className="context-section"><span className="section-overline">策略解读 · 示例</span><p>{proof.rationale}</p></div>
      <div className="context-section"><span className="section-overline">当前事实支撑 <em>{proof.factIds.length}</em></span>
        {proof.factIds.length ? proof.factIds.slice(0, 3).map(id => <button key={id} className="context-fact" onClick={() => inspect({ kind: 'fact', id })}><ShieldCheck size={16} /><span>{getFact(id).text}</span><ArrowUpRight size={14} /></button>) : <p className="muted">还没有入选的直接证据。这是一个可以保留的真实缺口。</p>}
      </div>
    </>}
    {contribution && <>
      <div className="context-selected"><span className="eyebrow">{contribution.organization}</span><h4>{contribution.title}</h4><Badge>{contribution.category}</Badge></div>
      <div className="context-section"><span className="section-overline">选择理由</span><p>{contribution.reason}</p></div>
      <div className="context-section"><span className="section-overline">取舍与边界</span><p>{contribution.tradeoff}</p></div>
      <div className="context-section"><span className="section-overline">可追溯的事实</span>{contribution.facts.map(id => <button className="context-fact" key={id} onClick={() => inspect({ kind: 'fact', id })}><FileText size={16} /><span>{getFact(id).text}</span><ArrowUpRight size={14} /></button>)}</div>
    </>}
    {fact && <>
      <div className="context-selected"><span className="eyebrow">FACT · {fact.id.toUpperCase()}</span><h4>{fact.text}</h4><FactStatus fact={fact} /></div>
      <div className="context-section"><span className="section-overline">来源材料 · 合成示例</span><div className="source-file"><FileText size={21} /><div><strong>{fact.source}</strong><small>{fact.locator}</small></div></div><blockquote>{fact.snippet}</blockquote></div>
      <div className="context-section"><span className="section-overline">所属贡献</span><button className="context-fact" onClick={() => inspect({ kind: 'contribution', id: fact.contributionId })}><span>{getContribution(fact.contributionId).title}</span><ArrowUpRight size={14} /></button></div>
      <p className="context-note">{fact.verification === 'UNCERTAIN' ? '这条主张尚未确认。可以保留在资产里，但不能直接进入简历。' : '这份 Demo 中的验证状态由合成场景预设，未核验真实材料。'}</p>
    </>}
    <button className="button button-secondary" onClick={() => askAssistant(proof ? `${proof.title}（${proof.priority}）：${proof.rationale}` : contribution ? `${contribution.title}：${state.descriptions[contribution.id]}` : fact ? `${fact.text}（${fact.verification}）` : '当前岗位策略')}>加入上下文，询问 AI</button>
  </aside>;
}
