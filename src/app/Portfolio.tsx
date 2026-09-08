import { useState } from 'react';
import { AlertTriangle, ArrowRight, ArrowRightLeft, ArrowUpRight, Check, ChevronDown, Layers, Plus, ShieldCheck, X } from 'lucide-react';
import { contributions, getContribution, getFact, type Role } from '../demo/fixtures';
import { coverage, portfolioChanged, riskyFacts } from '../application/demo-service';
import { Badge, FactStatus, Modal, coverageLabel, type PageProps } from './shared';

export function Portfolio({ state, service, run, inspect, goTab }: PageProps) {
  const [replacing, setReplacing] = useState<string | null>(null);
  const available = contributions.filter(contribution => !state.portfolio.some(item => item.contributionId === contribution.id));
  const risks = riskyFacts(state.portfolio); const proofs = coverage(state.portfolio, state.requirements);
  const dirty = portfolioChanged(state);
  return <div className="page-enter">
    <div className="section-heading top-heading"><div><span className="section-overline">CONTRIBUTION PORTFOLIO</span><h2>贡献组合</h2><p>选择用于本岗位的贡献、角色与可信事实。</p></div><Badge tone={dirty ? 'orange' : 'green'}>{dirty ? '组合待确认' : `组合 V${state.confirmed?.version} 已确认`}</Badge></div>
    <div className="mini-coverage" aria-label="组合覆盖">{proofs.map(proof => <button key={proof.id} onClick={() => inspect({ kind: 'proof', id: proof.id })}><span className={`coverage-mark ${proof.status.toLowerCase()}`}>{proof.status === 'COVERED' ? <Check size={13} /> : '·'}</span><span>{proof.title}</span><small>{coverageLabel[proof.status]}</small></button>)}</div>
    {risks.length > 0 && <div className="notice notice-warning" role="alert"><AlertTriangle size={19} /><div><strong>{risks.length} 条计划使用的事实尚未确认</strong><p>先取消使用这些事实，或回到资产完成审查。其他可信事实仍可保留。</p></div></div>}
    <div className="list-heading"><h3>当前组合 <span>{state.portfolio.length}</span></h3><span>推荐 2 项核心 + 1 项辅助</span></div>
    <div className="contribution-list">{state.portfolio.map((item, index) => {
      const contribution = getContribution(item.contributionId);
      return <article className={`contribution-card accent-${contribution.color}`} key={item.contributionId} data-testid={`portfolio-${item.contributionId}`}>
        <div className="contribution-top"><span className="card-index">0{index + 1}</span><div className="contribution-title"><span className="eyebrow">{contribution.organization} <span> / </span> {contribution.category}</span><button className="title-button" onClick={() => inspect({ kind: 'contribution', id: contribution.id })}>{contribution.title}<ArrowUpRight size={17} /></button></div>
          <select className="role-select" aria-label={`${contribution.title}角色`} value={item.role} onChange={event => run(() => service.setRole(contribution.id, event.target.value as Role))}><option value="CORE">CORE · 核心</option><option value="SUPPORTING">SUPPORTING · 辅助</option><option value="RESERVE">RESERVE · 备选</option></select></div>
        <p className="contribution-reason">{contribution.reason}</p>
        <div className="card-meta"><span><ShieldCheck size={14} />{item.factIds.filter(id => getFact(id).verification !== 'UNCERTAIN').length} 条可信事实</span><span><Layers size={14} />{item.role === 'RESERVE' ? '不进入正式内容' : item.role === 'CORE' ? '承担主要证明责任' : '补充证明责任'}</span></div>
        <div className="card-bottom"><details className="fact-details"><summary>计划使用的事实 <ChevronDown size={14} /></summary><div className="fact-options">{contribution.facts.map(id => { const fact = getFact(id); return <div className="fact-option" key={id}><label><input type="checkbox" checked={item.factIds.includes(id)} onChange={() => run(() => service.toggleFact(contribution.id, id))} /><span>{fact.text}</span></label><button className="fact-status-button" onClick={() => inspect({ kind: 'fact', id })} aria-label={`查看事实${id}来源`}><FactStatus fact={fact} /></button></div>; })}</div></details>
          <div className="card-actions"><button className="text-button" onClick={() => setReplacing(contribution.id)}><ArrowRightLeft size={14} />替换</button><button className="icon-button" aria-label={`移除${contribution.title}`} onClick={() => run(() => service.removeContribution(contribution.id), '已移除，证明责任覆盖已更新。')}><X size={16} /></button></div></div>
      </article>;
    })}</div>
    {!state.portfolio.length && <p className="inline-empty">组合为空。从下面添加至少一项贡献。</p>}
    <div className="list-heading"><h3>其他相关资产 <span>{available.length}</span></h3><span>加入前，先看看它能补充什么</span></div>
    <div className="candidate-grid">{available.map(contribution => <article className="candidate" key={contribution.id}><div className="candidate-top"><span className={`mini-symbol accent-${contribution.color}`}><Layers size={17} /></span><button className="icon-button" aria-label={`添加${contribution.title}`} onClick={() => run(() => service.addContribution(contribution.id), '已加入辅助组合，覆盖已更新。')}><Plus size={18} /></button></div><button className="title-button" onClick={() => inspect({ kind: 'contribution', id: contribution.id })}>{contribution.title}</button><p>{contribution.tradeoff}</p></article>)}</div>
    <div className="action-bar"><div><strong>{state.portfolio.filter(item => item.role !== 'RESERVE').length} 项入选 <span>·</span> {proofs.filter(proof => proof.status === 'COVERED').length}/{proofs.length} 项覆盖</strong><small>{risks.length ? '关键事实风险待处理' : '真实缺口可保留；确认后保存组合快照'}</small></div><button className="button button-primary" onClick={() => { if (run(() => service.confirmPortfolio(), '组合已确认，快照已保留。')) goTab('resume'); }}>确认组合，进入简历 <ArrowRight size={16} /></button></div>
    {replacing && <Modal title="替换这项贡献" onClose={() => setReplacing(null)}><p className="muted">替代「{getContribution(replacing).title}」。系统保留你选择的角色，并重新计算覆盖。</p>{available.length ? available.map(contribution => <button key={contribution.id} className="replace-option" onClick={() => { if (run(() => service.replaceContribution(replacing, contribution.id), '已替换，请查看新的覆盖情况。')) setReplacing(null); }}><div><strong>{contribution.title}</strong><p>{contribution.tradeoff}</p></div><ArrowRight size={18} /></button>) : <p>所有贡献已在当前组合。先移除一项，再进行替换。</p>}</Modal>}
  </div>;
}
