import { useCallback, useState, useSyncExternalStore } from 'react';
import { AlertTriangle, ArrowRight, BriefcaseBusiness, Check, ChevronRight, CircleHelp, Compass, FolderClosed, Home as HomeIcon, Layers3, Leaf, RotateCcw, Search, Settings2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { createDemoService, portfolioChanged } from '../application/demo-service';
import { job } from '../demo/fixtures';
import { Assistant } from './Assistant';
import { Strategy } from './Strategy';
import { Portfolio } from './Portfolio';
import { Resume } from './Resume';
import { Assets, Final, Home, Library, Settings } from './OtherPages';
import { Badge, ContextPanel, Modal, type Inspection, type PageProps, type Tab } from './shared';

type Page = 'home' | 'assets' | 'job' | 'library' | 'settings' | 'assistant';
const navigation = [
  { id: 'assistant' as const, label: 'AI 助手', english: 'Assistant', icon: Sparkles },
  { id: 'home' as const, label: '今日概览', english: 'Overview', icon: HomeIcon },
  { id: 'assets' as const, label: '职业资产', english: 'Career assets', icon: Layers3 },
  { id: 'job' as const, label: '求职工作区', english: 'Job workspace', icon: BriefcaseBusiness },
  { id: 'library' as const, label: '版本资料库', english: 'Library', icon: FolderClosed },
];
const tabs: { id: Tab; label: string; english: string }[] = [
  { id: 'strategy', label: '岗位策略', english: 'Strategy' },
  { id: 'portfolio', label: '贡献组合', english: 'Contributions' },
  { id: 'resume', label: '简历内容', english: 'Resume' },
  { id: 'final', label: '最终版本', english: 'Final' },
];

export default function App() {
  const [service] = useState(createDemoService);
  const state = useSyncExternalStore(service.subscribe, service.getSnapshot);
  const [page, setPage] = useState<Page>('job');
  const [tab, setTab] = useState<Tab>('strategy');
  const [inspection, setInspection] = useState<Inspection>({ kind: 'proof', id: 'ai' });
  const [modal, setModal] = useState<'jd' | 'help' | 'reset' | 'asset' | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const run = useCallback((action: () => void, message?: string) => {
    try { action(); setNotice(message ? { text: message, error: false } : null); return true; }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : '操作未完成，请重试。', error: true }); return false; }
  }, []);
  const goTab = useCallback((next: Tab) => {
    const snapshot = service.getSnapshot();
    if (next === 'resume' && snapshot.confirmed && !snapshot.content && !portfolioChanged(snapshot)) run(() => service.generateContent());
    setPage('job'); setTab(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [service, run]);
  const inspect = (selection: Inspection) => {
    setInspection(selection);
    if (window.innerWidth < 1080) requestAnimationFrame(() => document.getElementById('context-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const [contexts, setContexts] = useState<string[]>([]);
  const [selectionText, setSelectionText] = useState('');
  const [assistantKey, setAssistantKey] = useState(0);
  const askAssistant = (text: string) => { setContexts(previous => previous.includes(text) ? previous : [...previous, text]); setPage('assistant'); setSelectionText(''); window.getSelection()?.removeAllRanges(); window.scrollTo({ top: 0 }); };
  const newAsset = () => setModal('asset');
  const props: PageProps = { state, service, run, inspect, goTab, askAssistant, newAsset };
  const showContext = ['job', 'assets', 'library'].includes(page);
  const changePage = (next: Page) => { setPage(next); setNotice(null); window.scrollTo({ top: 0 }); };
  return <div className="app-shell" onMouseUp={event => { if ((event.target as HTMLElement).closest('input, textarea, button, dialog')) return; const text = window.getSelection()?.toString().trim() ?? ''; setSelectionText(text.slice(0, 4000)); }}>
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <aside className="sidebar">
      <button className="brand" onClick={() => changePage('home')} aria-label="Career Copilot 首页"><span className="brand-symbol"><Compass size={25} strokeWidth={1.4} /></span><span className="brand-wordmark">career<span>copilot</span></span></button>
      <div className="sidebar-section-label">你的职业工作台</div>
      <nav aria-label="主导航">{navigation.map(item => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => changePage(item.id)} aria-current={page === item.id ? 'page' : undefined}><item.icon size={19} /><span>{item.label}<small>{item.english}</small></span>{item.id === 'job' && <em>1</em>}</button>)}</nav>
      <div className="sidebar-direction"><div className="sidebar-section-label">当前方向 <span>↗</span></div><button onClick={() => goTab('strategy')}><span className="direction-dot" />AI 产品方向<ChevronRight size={14} /></button></div>
      <div className="sidebar-bottom"><button className={`settings-nav ${page === 'settings' ? 'selected' : ''}`} onClick={() => changePage('settings')}><Settings2 size={18} /><span>设置与演示说明</span></button><div className="profile"><span className="avatar">JK</span><div><strong>JKai</strong><small>个人工作空间</small></div><span className="profile-dot" /></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumbs"><span>个人工作空间</span><ChevronRight size={13} /><strong>{navigation.find(item => item.id === page)?.label ?? '演示设置'}</strong></div><div className="topbar-actions"><button className="top-search" aria-label="前往搜索职业资产" onClick={() => { changePage('assets'); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[aria-label="搜索职业资产"]')?.focus()); }}><Search size={16} /><span>搜索资产</span></button><span className="demo-label"><span />交互演示</span><button className="icon-button" title="演示指南" aria-label="演示指南" onClick={() => setModal('help')}><CircleHelp size={18} /></button><button className="icon-button" title="重置演示" aria-label="重置演示" onClick={() => setModal('reset')}><RotateCcw size={16} /></button></div></header>
      <main id="main-content" className="workspace-inner">
        {page === 'job' && <><section className="job-heading"><div className="job-identity"><div className="company-mark">星<span>✦</span></div><div><div className="job-overline">JOB WORKSPACE <span>/</span> 001</div><h1>{job.role}<Badge tone="green">{state.ready.length ? '内容已就绪' : state.confirmed ? '组合已确认' : '策略已就绪'}</Badge></h1><p>{job.company}<span>·</span>{job.location}<span>·</span>{job.season}<span className="synthetic-tag">示例岗位</span></p></div></div><button className="button button-secondary jd-button" onClick={() => setModal('jd')}>查看岗位原文 <ArrowRight size={15} /></button></section>
          <div className="workflow-tabs" role="tablist" aria-label="岗位工作流程">{tabs.map((item, index) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => goTab(item.id)}><span className="step-number">{(index === 0 || index === 1 && state.confirmed || index === 2 && state.ready.length) && tab !== item.id ? <Check size={13} /> : `0${index + 1}`}</span><strong>{item.label}</strong><small>{item.english}</small></button>)}</div></>}
        <div className={`content-layout ${showContext ? '' : 'no-context'}`}><div className="main-panel">
          {page === 'job' && tab === 'strategy' && <Strategy {...props} />}
          {page === 'job' && tab === 'portfolio' && <Portfolio {...props} />}
          {page === 'job' && tab === 'resume' && <Resume {...props} />}
          {page === 'job' && tab === 'final' && <Final {...props} />}
          {page === 'home' && <Home {...props} />}
          {page === 'assets' && <Assets {...props} />}
          {page === 'library' && <Library {...props} />}
          {page === 'settings' && <Settings />}
          <div hidden={page !== 'assistant'}><Assistant key={assistantKey} {...props} contexts={contexts} setContexts={setContexts} /></div>
        </div>{showContext && <div id="context-anchor"><ContextPanel state={state} selection={inspection} inspect={inspect} askAssistant={askAssistant} /></div>}</div>
        <footer className="workspace-footer"><span><ShieldCheck size={13} />演示模式 · 初始数据为合成示例</span><span>仅当前会话保存 · 刷新即可重置</span></footer>
      </main>
    </div>
    {selectionText && <button className="button button-primary selection-action" onMouseDown={event => event.preventDefault()} onClick={() => askAssistant(selectionText)}>加入 AI 上下文</button>}
    {modal === 'asset' && <Modal title="新增职业资产" onClose={() => setModal(null)}><p>先记录经历描述，保存为待审查草稿。尚未确认的描述不会自动进入简历。</p><form className="form-stack" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); if (run(() => service.addAssetDraft({ title: String(data.get('title')), organization: String(data.get('organization')), summary: String(data.get('summary')) }), '资产草稿已保存，可在职业资产中查看。')) { setModal(null); setPage('assets'); } }}><label>资产名称<input name="title" required maxLength={80} /></label><label>机构或项目<input name="organization" maxLength={120} /></label><label>经历描述<textarea name="summary" required rows={4} /></label><p className="muted">Demo 可记录和修改草稿；事实提取、确认及加入简历将在后续接入。</p><button className="button button-primary">保存资产草稿</button></form></Modal>}
    {notice && <div className={`toast ${notice.error ? 'toast-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.error ? <AlertTriangle size={18} /> : <Check size={18} />}<span>{notice.text}</span><button aria-label="关闭提示" onClick={() => setNotice(null)}><X size={16} /></button></div>}
    {modal === 'jd' && <Modal title="岗位原文 · 合成示例" onClose={() => setModal(null)}><Badge>星河科技 · AI 产品实习生</Badge><p className="jd-content">{job.jd}</p><p className="muted small">此岗位文本用于交互验证，不对应真实招聘信息。</p></Modal>}
    {modal === 'help' && <Modal title="演示指南" onClose={() => setModal(null)}><div className="guide-intro"><Sparkles size={24} /><p>初始数据为预设场景；新增内容仅保留在当前会话。</p></div><ol className="guide-steps"><li><strong>理解岗位</strong><p>点击证明责任，右侧查看 JD 和事实依据。</p></li><li><strong>调整组合</strong><p>移除用户研究，看看产品判断的覆盖如何变化。</p></li><li><strong>验证事实边界</strong><p>勾选“独立主导”再确认，体验高风险阻塞。</p></li><li><strong>编辑并保留历史</strong><p>生成内容后改一个数字，或回到组合替换经历，查看审查和局部更新。</p></li></ol><button className="button button-primary" onClick={() => setModal(null)}>开始体验 <ArrowRight size={16} /></button></Modal>}
    {modal === 'reset' && <Modal title="恢复初始演示？" onClose={() => setModal(null)}><p>将清除当前演示中的组合调整、内容版本与虚拟文件，恢复合成示例。不会涉及任何真实文件。</p><div className="modal-actions"><button className="button button-secondary" onClick={() => setModal(null)}>继续当前演示</button><button className="button button-primary" onClick={() => { service.reset(); setContexts([]); setAssistantKey(value => value + 1); setSelectionText(''); setModal(null); setNotice(null); setInspection({ kind: 'proof', id: 'ai' }); goTab('strategy'); }}>恢复初始演示</button></div></Modal>}
    {state.pendingEdit && <Modal title="这次编辑，需要事实审查" onClose={() => service.dismissEdit()}><div className="notice notice-warning"><AlertTriangle size={20} /><p>演示规则无法确认这段新文字与已有事实一致，因此原文尚未被替换。</p></div><span className="field-label">待审查文字</span><p className="review-text">{state.pendingEdit.text}</p><span className="field-label">当前可信表达</span><p className="review-original">{state.content?.items.find(item => item.id === state.pendingEdit!.itemId)?.text}</p><p className="muted small">当前 Demo 不新增或确认真实职业事实。可恢复原文，或仅用已有可信事实重新表达。</p><div className="modal-actions"><button className="button button-secondary" onClick={() => service.dismissEdit()}>恢复原文</button><button className="button button-primary" onClick={() => { const id = state.pendingEdit!.itemId; service.dismissEdit(); run(() => service.rewrite(id, 'compact'), '已用现有可信事实重新表达。'); }}>保留原事实，重新表达</button></div></Modal>}
  </div>;
}
