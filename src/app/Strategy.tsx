import { useState } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { contributions, getFact } from '../demo/fixtures';
import { coverage } from '../application/demo-service';
import { Badge, Modal, coverageLabel, type PageProps } from './shared';

export function Strategy({ state, service, run, inspect, goTab, askAssistant, newAsset }: PageProps) {
  const proofs = coverage(state.portfolio, state.requirements);
  const [gapId, setGapId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const gap = proofs.find(item => item.id === gapId);
  const candidates = gap ? contributions.filter(item => item.facts.some(id => getFact(id).verification !== 'UNCERTAIN' && getFact(id).proofs.some(proof => proof === gap.id))) : [];
  return <div className="page-enter">
    <div className="section-heading"><div><h2>岗位能力要求</h2><p>核心：优先证明；重要：建议覆盖；辅助：按篇幅取舍。可调整本次简历的侧重点。</p></div><button className="button button-secondary" onClick={() => setAdding(true)}><Plus size={16} />添加能力</button></div>
    <p className="muted">已覆盖 {proofs.filter(item => item.status === 'COVERED').length} / {proofs.length} 项纳入要求 · 覆盖为演示规则判断，不代表匹配分。</p>
    <div className="requirement-list">{state.requirements.map(proof => {
      const result = proofs.find(item => item.id === proof.id);
      return <article className={`requirement-card ${proof.included ? '' : 'excluded'}`} key={proof.id} data-testid={`requirement-${proof.id}`}>
        <div className="requirement-top"><button className="title-button" aria-label={`查看${proof.title}依据`} onClick={() => inspect({ kind: 'proof', id: proof.id })}>{proof.title}</button><select aria-label={`${proof.title}重要性`} value={proof.priority} onChange={event => run(() => service.updateRequirement(proof.id, { priority: event.target.value }))}>{['核心', '重要', '辅助'].map(value => <option key={value}>{value}</option>)}</select></div>
        <p>{proof.rationale}</p><p className="muted">{proof.id.startsWith('custom-') ? '来源：用户补充' : `岗位依据：${proof.quote}`}</p>
        <div className="requirement-bottom"><label><input type="checkbox" checked={proof.included} onChange={event => run(() => service.updateRequirement(proof.id, { included: event.target.checked }))} />纳入本次简历</label>
          {result ? <button className="button button-secondary" onClick={() => setGapId(proof.id)}>{coverageLabel[result.status]} · 查看{result.status === 'COVERED' ? '支撑' : '补充方式'}</button> : <Badge>本次不纳入 · 可重新勾选</Badge>}
        </div>
      </article>;
    })}</div>
    <div className="action-bar"><span>侧重点调整会要求重新确认组合，历史版本保留。</span><button className="button button-primary" onClick={() => goTab('portfolio')}>查看推荐组合 <ArrowRight size={16} /></button></div>
    {adding && <Modal title="添加岗位能力" onClose={() => setAdding(false)}><form className="form-stack" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); if (run(() => service.addRequirement(String(data.get('title')), String(data.get('rationale')), String(data.get('priority'))), '已添加能力，当前尚无绑定证据。')) setAdding(false); }}><label>能力名称<input name="title" required maxLength={80} /></label><label>能力说明<textarea name="rationale" required rows={3} /></label><label>重要性<select name="priority"><option>重要</option><option>核心</option><option>辅助</option></select></label><button className="button button-primary">保存能力</button></form></Modal>}
    {gap && <Modal title={`${gap.title} · ${coverageLabel[gap.status]}`} onClose={() => setGapId(null)}><p>{gap.rationale}</p><p>{gap.factIds.length ? `当前有 ${gap.factIds.length} 条可信事实支撑。` : '当前组合没有可直接证明这项能力的事实。'}</p>
      {gap.factIds.map(id => <p key={id}>• {getFact(id).text}</p>)}
      <h3>可采取的操作</h3>{candidates.map(item => { const selected = state.portfolio.find(value => value.contributionId === item.id); return <div className="gap-candidate" key={item.id}><strong>{item.title}</strong><button className="button button-secondary" onClick={() => { if (selected) { setGapId(null); goTab('portfolio'); } else run(() => service.addContribution(item.id), '已加入组合，覆盖已重新计算。'); }}>{selected ? '检查已选事实' : '加入当前组合'}</button></div>; })}
      {!candidates.length && <p className="muted">现有示例中没有对应贡献。可先记录资产草稿，后续审查事实并关联能力。</p>}
      <div className="modal-actions"><button className="button button-secondary" onClick={() => { setGapId(null); newAsset(); }}>新增资产</button><button className="button button-secondary" onClick={() => { setGapId(null); askAssistant(`${gap.title}（${gap.priority}）：${gap.rationale}；当前 ${gap.factIds.length} 条事实支撑。`); }}>向 AI 询问</button><button className="button button-primary" onClick={() => { setGapId(null); run(() => {}, '已保留真实缺口，可以继续准备简历。'); }}>保留缺口并继续</button></div>
    </Modal>}
  </div>;
}
