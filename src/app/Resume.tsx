import { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, Check, ChevronDown, Copy, Eye, FileCheck2, Pencil, Pin, RefreshCw, Sparkles } from 'lucide-react';
import { getContribution, getFact, requirements } from '../demo/fixtures';
import { affectedContributions, portfolioChanged, type ContentItem } from '../application/demo-service';
import { Badge, EmptyState, Modal, type PageProps } from './shared';

export function Resume({ state, service, run, inspect, goTab }: PageProps) {
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [preview, setPreview] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const dirty = portfolioChanged(state);
  const affected = affectedContributions(state);
  const content = state.content;
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopyStatus('已复制，可粘贴到外部排版工具。'); }
    catch { setCopyStatus('剪贴板不可用。请选择下方文字，手动复制。'); }
  };
  const fullText = content?.items.map(item => `${getContribution(item.contributionId).organization}｜${getContribution(item.contributionId).title}\n• ${item.text}`).join('\n\n') ?? '';
  if (!content) return <EmptyState title="尚未生成简历内容" action={<button className="button button-primary" onClick={() => dirty ? goTab('portfolio') : run(() => service.generateContent())}>{dirty ? '返回确认组合' : '生成简历初稿'}<ArrowRight size={16} /></button>}>先确认用于这个岗位的贡献与事实，再生成有依据的简历初稿。</EmptyState>;
  return <div className="page-enter">
    <div className="section-heading top-heading"><div><span className="section-overline">RESUME CONTENT</span><h2>简历内容</h2><p>编辑工作草稿、检查事实来源并保存内容版本。</p></div><button className="button button-secondary" onClick={() => { setPreview(true); setCopyStatus(''); }}><Eye size={16} />纯净预览</button></div>
    {dirty && <div className="notice notice-warning"><AlertTriangle size={18} /><div><strong>工作组合有未确认的变更</strong><p>当前内容仍基于组合 V{content.basedOnVersion}。请先确认新组合，再决定更新哪些内容。</p></div><button className="text-button" onClick={() => goTab('portfolio')}>查看组合 <ArrowRight size={15} /></button></div>}
    {!dirty && state.confirmed?.version !== content.basedOnVersion && <div className="notice notice-warning" role="status"><RefreshCw size={18} /><div><strong>{affected.length ? `${affected.length} 项贡献的内容需要更新` : '组合版本已更新'}</strong><p>未受影响的文字与固定事实会保留，旧内容版本不会改变。</p></div><button className="button button-secondary" onClick={() => run(() => service.updateAffected(), '已更新受影响内容，其他文字与固定事实已保留。')}>更新受影响内容</button></div>}
    <div className="resume-plan"><span><FileCheck2 size={16} />基于组合 V{content.basedOnVersion}</span><span>{content.items.length} 个内容单元</span><span>工作草稿</span><Badge tone="green">仅使用可信事实</Badge></div>
    <div className="resume-paper"><header className="paper-heading"><span>EXPERIENCE & PROJECTS</span><span>经历与项目</span></header>{content.items.map((item, index) => <ContentCard key={item.id} item={item} index={index} count={content.items.length} service={service} run={run} inspect={inspect} edit={() => setEditing({ id: item.id, text: item.text })} copy={() => void copy(item.text)} />)}</div>
    {copyStatus && <p className="copy-status" role="status">{copyStatus}</p>}
    <div className="notice notice-subtle"><Sparkles size={17} /><p>演示改写使用预设表达。任何非预设编辑都会进入事实审查，不会被当作已经 AI 验证。</p></div>
    <div className="action-bar"><div><strong>准备好进入排版了吗？</strong><small>确认后保存内容快照；复制本身不会确认版本。</small></div><button className="button button-primary" onClick={() => { if (run(() => service.markReady(), '内容版本已保存，后续修改不会覆盖它。')) goTab('final'); }}>确认内容，保存版本 <Check size={16} /></button></div>
    {editing && <Modal title="编辑这条内容" onClose={() => setEditing(null)}><label className="field-label" htmlFor="content-edit">简历文字</label><textarea id="content-edit" className="editor-input" value={editing.text} onChange={event => setEditing({ ...editing, text: event.target.value })} rows={6} /><p className="muted small">可以尝试把 10% 改成 15%，查看事实审查如何保护原文。</p><div className="modal-actions"><button className="button button-secondary" onClick={() => setEditing(null)}>取消</button><button className="button button-primary" onClick={() => { if (run(() => service.editContent(editing.id, editing.text))) setEditing(null); }}>保存并检查</button></div></Modal>}
    {preview && <Modal title="纯净预览" onClose={() => setPreview(false)} wide><div className="preview-page"><span className="eyebrow">CAREER COPILOT / CONTENT PREVIEW</span><h2>经历与项目</h2>{content.items.map(item => <section key={item.id}><h3>{getContribution(item.contributionId).organization} <span>｜{getContribution(item.contributionId).title}</span></h3><p>• {item.text}</p></section>)}</div><p className="copy-status" role="status">{copyStatus || '只复制内容，继续在你熟悉的工具中排版。'}</p><button className="button button-primary" onClick={() => void copy(fullText)}><Copy size={16} />复制全部内容</button></Modal>}
  </div>;
}
function ContentCard({ item, index, count, service, run, inspect, edit, copy }: { item: ContentItem; index: number; count: number; service: PageProps['service']; run: PageProps['run']; inspect: PageProps['inspect']; edit: () => void; copy: () => void }) {
  const contribution = getContribution(item.contributionId);
  const proofIds = [...new Set(item.factIds.flatMap(id => getFact(id).proofs))];
  return <article className="content-card" data-testid={item.id} data-ai-target={`bullet:${item.id}`}>
    <div className="content-heading"><div><span className="eyebrow">{contribution.organization}<span> / </span>{contribution.period}</span><h3>{contribution.title}</h3></div><span className="content-number">0{index + 1}</span></div>
    <button className="content-text" onClick={() => inspect({ kind: 'contribution', id: contribution.id })}><span className="bullet-dot" /><span>{item.text}</span><ArrowUpRight size={16} /></button>
    <div className="purpose-line"><span>证明责任</span>{proofIds.map(id => <button key={id} onClick={() => inspect({ kind: 'proof', id })}>{requirements.find(proof => proof.id === id)?.title}</button>)}</div>
    <div className="content-toolbar"><button onClick={edit}><Pencil size={14} />编辑</button><button onClick={() => run(() => service.rewrite(item.id, 'compact'), '已使用紧凑表达，事实保持不变。')}><Sparkles size={14} />紧凑表达</button><select aria-label={`${contribution.title}叙述重点`} value={item.style} onChange={event => run(() => service.rewrite(item.id, event.target.value as ContentItem['style']))}><option value="standard">默认叙述</option><option value="compact">紧凑表达</option><option value="technical">强调技术</option><option value="business">强调业务</option></select><span className="toolbar-spacer" /><button onClick={copy} aria-label={`复制${contribution.title}`}><Copy size={14} /></button><button disabled={index === 0} aria-label={`上移${contribution.title}`} onClick={() => run(() => service.moveContent(item.id, -1))}><ArrowUp size={14} /></button><button disabled={index === count - 1} aria-label={`下移${contribution.title}`} onClick={() => run(() => service.moveContent(item.id, 1))}><ArrowDown size={14} /></button></div>
    <details className="content-facts"><summary>使用的事实与固定项 <span>{item.factIds.length} 条事实 · {item.pinned.length} 项固定</span><ChevronDown size={14} /></summary><div className="content-fact-list">{contribution.facts.map(id => { const fact = getFact(id); return <div className="content-fact-row" key={id}><label><input type="checkbox" checked={item.factIds.includes(id)} onChange={() => run(() => service.swapContentFact(item.id, id))} /><span>{fact.text}</span></label><button className={`icon-button ${item.pinned.includes(id) ? 'pinned' : ''}`} disabled={!item.factIds.includes(id)} aria-label={`${item.pinned.includes(id) ? '取消固定' : '固定'}${fact.text}`} onClick={() => run(() => service.pinFact(item.id, id))}><Pin size={15} /></button><button className="icon-button" aria-label={`查看事实${id}依据`} onClick={() => inspect({ kind: 'fact', id })}><ArrowUpRight size={15} /></button></div>; })}</div></details>
  </article>;
}
