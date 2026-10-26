import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Compass, Layers3, BriefcaseBusiness, FolderClosed, Settings2, Home, ArrowRight, ShieldCheck, Check, X, FileText, Plus, Sparkles } from 'lucide-react';
import { createCareerService, emptyCareerState, errorMessage, resumeHtml, resumeMarkdown, download, type Action, type Fact, type Resume, type CareerService } from '../application/career-service';
import { loadStorageInfo, type StorageInfo } from '../infrastructure/storage';
import DemoApp from './App';
import { Modal } from './shared';
import { createAiService, type AiService } from '../application/ai-service';
import { AiSettings } from './AiSettings';
import { RealAssistant, type AiIntent } from './RealAssistant';
import './real-ai.css';
import './workspace.css';
type Page = 'overview' | 'assets' | 'jobs' | 'library' | 'settings';
const owners = [['UNKNOWN','尚不确定'],['CONTRIBUTOR','参与贡献'],['CORE_CONTRIBUTOR','核心贡献者'],['LEAD','主导'],['INDEPENDENT','独立完成'],['TEAM_RESULT','团队成果']];
function field(data: FormData, name: string) { return String(data.get(name) ?? ''); }
function Empty({ children }: { children: ReactNode }) { return <div className="real-empty">{children}</div>; }
function ResumePreview({ resume }: { resume: Resume }) {
 const groups = new Map<string, string[]>();
 for (const i of resume.plan.items) { const key = i.organization + ' · ' + i.title + (i.role ? ' / ' + i.role : ''); groups.set(key, [...(groups.get(key) ?? []), i.text]); }
 return <article className="real-paper"><h1>{resume.plan.name}</h1><p>{resume.plan.contact}</p>{resume.plan.education && <><h2>教育背景</h2><p className="preserve-lines">{resume.plan.education}</p></>}<h2>项目与工作经历</h2>{[...groups].map(([title, facts]) => <section key={title}><h3>{title}</h3><ul>{facts.map((text, index) => <li key={index}>{text}</li>)}</ul></section>)}</article>;
}
export default function WorkspaceApp({ service: provided, aiService: providedAi }: { service?: CareerService; aiService?: AiService }) {
 const [service] = useState(() => provided ?? createCareerService());
 const [aiService] = useState(() => providedAi ?? createAiService(undefined, service.native));
 const [assistantOpen,setAssistantOpen] = useState(false);
 const [aiIntent,setAiIntent] = useState<AiIntent>();
 const [configurationVersion,setConfigurationVersion] = useState(0);
 const [requirementsDraft,setRequirementsDraft] = useState<Record<string,string>>({});
 const [state, setState] = useState(emptyCareerState);
 const [page, setPage] = useState<Page>('overview');
 const [demo, setDemo] = useState(false);
 const [busy, setBusy] = useState(false);
 const [loaded, setLoaded] = useState(false);
 const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
 const [jobId, setJobId] = useState('');
 const [selected, setSelected] = useState<string[]>([]);
 const [review, setReview] = useState<Fact | null>(null);
 const [editFact, setEditFact] = useState<Fact | null>(null);
 const [modal, setModal] = useState<'asset' | 'job' | null>(null);
 const [storage, setStorage] = useState<StorageInfo>();
 const [query, setQuery] = useState('');
 const [resumeId, setResumeId] = useState('');
 const [readyTab, setReadyTab] = useState<'strategy' | 'portfolio' | 'resume' | 'final'>('strategy');
 const load = async () => { const next = await service.load(); setState(next); setLoaded(true); };
 useEffect(() => {
  let alive = true;
  if (service.native) service.load().then(next => { if (alive) { setState(next); setLoaded(true); } }).catch(error => { if (alive) setNotice({ text: errorMessage(error), error: true }); });
  else setLoaded(true);
  loadStorageInfo().then(info => { if (alive) setStorage(info); }).catch(() => {});
  return () => { alive = false; };
 }, [service]);
 const perform = async (work: () => Promise<unknown>, success: string) => {
  if (busy) return false;
  setBusy(true); setNotice(null);
  try {
   await work();
   try { await load(); }
   catch { setNotice({ text: '操作已完成，但读取最新状态失败。请重新启动后查看，勿重复提交。', error: true }); return true; }
   setNotice({ text: success, error: false }); return true;
  }
  catch (error) { setNotice({ text: errorMessage(error), error: true }); return false; }
  finally { setBusy(false); }
 };
 const act = (action: Action, message: string) => perform(() => service.execute(action), message);
 const submit = (event: FormEvent<HTMLFormElement>, action: (data: FormData) => Promise<boolean>, close?: () => void) => {
  event.preventDefault(); const form = event.currentTarget;
  void action(new FormData(form)).then(ok => { if (ok) { form.reset(); close?.(); } });
 };
 const job = state.jobs.find(j => j.id === jobId) ?? state.jobs[0];
 const analysis = state.analyses.filter(a => a.jobId === job?.id).at(-1);
 const portfolio = state.portfolios.filter(p => p.jobId === job?.id).at(-1);
 const jobResumes = state.resumes.filter(r => r.jobId === job?.id);
 const availableResumes = readyTab === 'final' ? jobResumes.filter(r => r.status === 'CONTENT_READY') : jobResumes;
 const latestResume = availableResumes.find(r => r.id === resumeId) ?? availableResumes.at(-1);
 const trusted = state.facts.filter(f => f.state === 'ACTIVE' && f.verification === 'USER_CONFIRMED' && state.assets.some(a => a.id === f.contributionId));
 const switchJob = (id: string) => { setJobId(id); setSelected([]); setResumeId(''); setReadyTab('strategy'); };
 const navigation = [
  { id: 'overview' as const, title: '今日概览', icon: Home },
  { id: 'assets' as const, title: '职业资产', icon: Layers3 },
  { id: 'jobs' as const, title: '求职工作区', icon: BriefcaseBusiness },
  { id: 'library' as const, title: '版本资料库', icon: FolderClosed },
 ];
 if (demo) return <><div className="return-real"><button className="button button-primary" onClick={() => setDemo(false)}>返回个人工作区</button></div><DemoApp /></>;
 return <div className={'app-shell real-app ' + (assistantOpen ? 'has-assistant' : '')}>
  <a className="skip-link" href="#real-main">跳到主要内容</a>
  <aside className="sidebar">
   <button className="brand" onClick={() => setPage('overview')}><span className="brand-symbol"><Compass /></span><span className="brand-wordmark">career<span>copilot</span></span></button>
   <div className="sidebar-section-label">个人求职工作台</div>
   <nav aria-label="个人工作区导航">{navigation.map(n => <button key={n.id} className={'nav-item ' + (page === n.id ? 'active' : '')} aria-current={page === n.id ? 'page' : undefined} onClick={() => setPage(n.id)}><n.icon size={18} /><span>{n.title}</span></button>)}</nav>
   <div className="sidebar-direction"><div className="sidebar-section-label">当前目标</div><p>{job ? job.roleTitle : '添加你的第一个岗位'}</p></div>
   <div className="sidebar-bottom"><button className="assistant-entry" role="switch" aria-label="个人 AI 助手" aria-checked={assistantOpen} onClick={()=>setAssistantOpen(v=>!v)}><Sparkles size={18}/><span className="assistant-entry-label">AI 助手</span><span className="assistant-switch-track" aria-hidden="true"><span/></span></button><button className="settings-nav" onClick={() => setPage('settings')}><Settings2 size={18} />设置与数据</button><button className="settings-nav" onClick={() => setDemo(true)}>查看交互演示</button><div className="profile"><span className="avatar">我</span><div><strong>个人工作区</strong><small>本地保存 · 自己掌控</small></div></div></div>
  </aside>
  <div className="workspace">
   <header className="topbar"><div className="breadcrumbs">个人工作区 <span>/</span><strong>{navigation.find(n => n.id === page)?.title ?? '设置与数据'}</strong></div><span className="badge badge-green"><ShieldCheck size={13} />{service.native ? 'SQLite 本地工作区' : '桌面版专属'}</span></header>
   <main className="workspace-inner" id="real-main" aria-busy={busy}>
   {!service.native && <div className="notice notice-warning"><p>个人数据只在桌面版保存。请打开 Career Copilot 桌面程序；你也可以查看合成数据的交互演示。</p><button className="button button-secondary" onClick={() => setDemo(true)}>查看交互演示</button></div>}
   {!loaded ? <Empty>正在读取工作区…{notice && <button onClick={() => void perform(load, '已重新读取工作区。')}>重新读取</button>}</Empty> :
   <fieldset className="real-fields" disabled={busy || !service.native}>
   {page === 'overview' && <div className="page-enter">
    <div className="section-heading"><div><span className="section-overline">CAREER WORKSPACE</span><h1>为下一次机会做好准备</h1><p>让真实经历，成为你的下一步。</p></div><button className="button button-primary" onClick={() => setModal('asset')}><Plus size={17} />新增职业资产</button></div>
    <div className="real-stats">{[['职业资产',state.assets.length],['已确认事实',trusted.length],['目标岗位',state.jobs.length],['内容版本',state.resumes.length]].map(([label,count]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}</div>
    <div className="real-next"><span className="section-overline">下一步</span><h2>{!state.assets.length ? '先记录一段真实经历' : !trusted.length ? '审查你的事实' : !state.jobs.length ? '添加目标岗位' : '继续准备岗位简历'}</h2><p>从经历中提炼可确认的事实，再为目标岗位选择证据。简历内容只使用你明确确认的事实。</p><button className="button button-primary" onClick={() => { if (!state.assets.length) setModal('asset'); else setPage(!trusted.length ? 'assets' : 'jobs'); }}>继续准备 <ArrowRight size={16} /></button></div>
    {state.applications.length > 0 && <><h2>最近投递</h2><div className="real-list">{state.applications.slice(0,5).map(a => <article className="real-card" key={a.id}><strong>{state.jobs.find(j => j.id === a.jobId)?.company} · {state.jobs.find(j => j.id === a.jobId)?.roleTitle}</strong><p>{a.channel} · {a.appliedAt.slice(0,10)} · {a.status}</p></article>)}</div></>}
   </div>}
   {page === 'assets' && <div className="page-enter">
    <div className="section-heading"><div><h1>职业资产</h1><p>经历描述用于背景；单独审查的事实才可以进入简历。</p></div><button className="button button-primary" onClick={() => setModal('asset')}>新增职业资产</button></div>
    <label className="search-input"><input aria-label="搜索个人职业资产" value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索名称、机构或描述" /></label>
    {!state.assets.length && <Empty>还没有职业资产。添加一段工作、实习或项目经历开始。</Empty>}
    {state.assets.filter(a => (a.title + a.organization + a.summary).includes(query)).map(asset => <article className="real-card" key={asset.id}>
     <div className="section-heading"><div><span className="eyebrow">{asset.organization} · {asset.role}</span><h2>{asset.title}</h2></div><button className="text-button" onClick={() => { if (window.confirm('归档这项资产？历史简历保留，新组合将不能再选用其中事实。')) void act({ type: 'archive_asset', contribution_id: asset.id }, '资产已归档，历史内容保留。'); }}>归档</button></div>
     <p className="preserve-lines">{asset.summary}</p>
     <h3>事实清单</h3>
     {state.facts.filter(f => f.contributionId === asset.id).map(fact => <div className={'real-fact ' + (fact.state === 'RETRACTED' ? 'retracted' : '')} key={fact.id}>
      <div><p>{fact.content}</p><span className={'badge ' + (fact.verification === 'USER_CONFIRMED' ? 'badge-green' : 'badge-orange')}>{fact.state === 'RETRACTED' ? '已撤回' : fact.verification === 'USER_CONFIRMED' ? '用户已确认' : '待审查'}</span> <small>版本 {fact.revision} · {owners.find(o => o[0] === fact.ownership)?.[1]}{fact.risk === 'HIGH' ? ' · 需核实数字或职责' : ''}</small></div>
      {fact.state === 'ACTIVE' && <div className="real-actions">{fact.verification === 'UNCERTAIN' && <button className="button button-secondary" onClick={() => setReview(fact)}>审查事实</button>}<button className="text-button" onClick={() => setEditFact(fact)}>修订</button><button className="text-button" onClick={() => { if (window.confirm('撤回这条事实？历史快照保留，新简历将不能再使用。')) void act({ type: 'retract_fact', fact_id: fact.id, expected_revision_id: fact.revisionId }, '事实已撤回，历史快照保留。'); }}>撤回</button></div>}
     </div>)}
     <form className="real-add-fact" onSubmit={e => submit(e, d => act({ type:'add_fact', contribution_id:asset.id, content:field(d,'content'), ownership:field(d,'ownership') }, '事实已保存为待审查，请确认后再用于简历。'))}>
      <label>新增一条可核实的事实<textarea name="content" required maxLength={4000} rows={2} placeholder="只记录你实际做过的事；不确定的数字不要填写。" /></label>
      <div className="real-actions"><label>个人职责<select name="ownership" defaultValue="UNKNOWN">{owners.map(([v,label]) => <option value={v} key={v}>{label}</option>)}</select></label><button className="button button-secondary">保存待审查事实</button></div>
     </form>
    </article>)}
   </div>}
   {page === 'jobs' && <div className="page-enter">
    <div className="section-heading"><div><h1>求职工作区</h1><p>每个岗位保留独立策略、组合、简历和最终文件。</p></div><button className="button button-primary" onClick={() => setModal('job')}>新增岗位</button></div>
    {!job ? <Empty>粘贴岗位描述，创建你的第一个目标岗位。</Empty> : <>
     <label className="real-job-select">当前岗位<select value={job.id} onChange={e => switchJob(e.target.value)}>{state.jobs.map(j => <option key={j.id} value={j.id}>{j.company} · {j.roleTitle}</option>)}</select></label>
     <div className="workflow-tabs" role="tablist" aria-label="个人岗位流程">{([['strategy','岗位要求'],['portfolio','贡献组合'],['resume','简历内容'],['final','最终文件']] as const).map(([id,label]) => <button key={id} role="tab" aria-selected={readyTab === id} className={readyTab === id ? 'active' : ''} onClick={() => setReadyTab(id)}>{label}</button>)}</div>
     {readyTab === 'strategy' && <>
      <details className="real-card"><summary>岗位原文</summary><p className="preserve-lines">{job.jd}</p></details>
      <form key={job.id + (analysis?.id ?? '')} className="real-card form-stack" onSubmit={e => submit(e, d => act({type:'save_analysis',job_id:job.id,expected_jd:job.jd,requirements:field(d,'requirements').split('\n').map(s => s.trim()).filter(Boolean)}, '岗位要求已保存为新版本。'), () => {setRequirementsDraft(previous=>{const next={...previous};delete next[job.id];return next;});setReadyTab('portfolio');})}>
       <h2>这个岗位需要证明什么？</h2><p className="muted">从 JD 中提炼能力及重要性，每行一项，例如“核心：能把用户需求拆成可验证的产品方案”。可手工整理，也可让 AI 生成建议后由你决定是否应用。</p>
       <div className="real-actions"><button type="button" className="button button-secondary" onClick={()=>{setAiIntent({sequence:Date.now(),jobId:job.id});setAssistantOpen(true);}}>AI 分析当前岗位</button><button type="button" className="text-button" onClick={()=>setRequirementsDraft(previous=>{const next={...previous};delete next[job.id];return next;})}>恢复已保存的要求</button></div>
       <label>能力与证明要求<textarea name="requirements" required rows={6} maxLength={16000} value={requirementsDraft[job.id]??analysis?.requirements.join('\n')??''} onChange={e=>setRequirementsDraft(old=>({...old,[job.id]:e.target.value}))} placeholder="核心：…\n重要：…\n辅助：…" /></label>
       <button className="button button-primary">保存岗位要求，选择事实</button>
      </form>
     </>}
     {readyTab === 'portfolio' && <div className="real-card">
      <h2>选择最能支持岗位的事实</h2>
      {!analysis ? <Empty>请先保存岗位要求。<button className="button button-secondary" onClick={() => setReadyTab('strategy')}>返回岗位要求</button></Empty> : <>
       <ul>{analysis.requirements.map((r,i) => <li key={i}>{r}</li>)}</ul><p className="muted">只显示当前有效、已经由你审查确认的事实。根据上面的要求选择，避免堆砌无关经历。</p>
       {!trusted.length && <Empty>还没有已确认事实。<button onClick={() => setPage('assets')}>前往职业资产审查</button></Empty>}
       {trusted.map(f => <label className="real-choice" key={f.revisionId}><input type="checkbox" checked={selected.includes(f.revisionId)} onChange={e => setSelected(previous => e.target.checked ? [...previous,f.revisionId] : previous.filter(id => id !== f.revisionId))} /><span><strong>{state.assets.find(a => a.id === f.contributionId)?.title}</strong><br />{f.content}</span></label>)}
       <button className="button button-primary" disabled={!selected.length} onClick={() => { void act({type:'confirm_portfolio',job_id:job.id,analysis_id:analysis.id,revision_ids:selected},'组合已确认并保存快照。').then(ok => { if(ok) setReadyTab('resume'); }); }}>确认组合（{selected.length} 条事实）</button>
       {portfolio && <p className="muted">已有确认组合 V{portfolio.version}；再次确认会创建新版本。</p>}
      </>}
     </div>}
     {readyTab === 'resume' && <>
      {!portfolio ? <Empty>请先确认贡献组合。<button onClick={() => setReadyTab('portfolio')}>选择事实</button></Empty> : <form className="real-card form-stack" onSubmit={e => submit(e, d => act({type:'compile_resume',portfolio_id:portfolio.id,name:field(d,'name'),contact:field(d,'contact'),education:field(d,'education')},'内容草稿已保存，请预览后确认就绪。'))}>
       <h2>生成可排版的简历内容</h2><p className="muted">基于组合 V{portfolio.version} 的已确认事实原文，不自动增加数字或夸大职责。修改事实后请重新确认组合。</p>
       <div className="real-form-grid"><label>姓名<input name="name" required maxLength={100} defaultValue={latestResume?.plan.name} autoComplete="name" /></label><label>联系方式<input name="contact" required maxLength={500} defaultValue={latestResume?.plan.contact} placeholder="邮箱 · 电话 · 作品集链接" /></label></div>
       <label>教育背景（可选，自行核实）<textarea name="education" rows={2} maxLength={4000} defaultValue={latestResume?.plan.education} /></label>
       <button className="button button-primary">生成并保存内容版本</button>
      </form>}
      {latestResume && <><div className="real-actions"><span className="badge badge-green">内容 V{latestResume.version} · {latestResume.status === 'CONTENT_READY' ? '已就绪' : '待确认草稿'}</span><button className="button button-secondary" onClick={() => download(resumeMarkdown(latestResume),'text/markdown;charset=utf-8','resume-v'+latestResume.version+'.md')}>导出 Markdown</button><button className="button button-secondary" onClick={() => download(resumeHtml(latestResume),'text/html;charset=utf-8','resume-v'+latestResume.version+'.html')}>导出排版稿</button>{latestResume.status === 'DRAFT' && <button className="button button-primary" onClick={() => void act({type:'mark_ready',resume_id:latestResume.id},'内容已确认就绪并冻结。')}>确认内容就绪</button>}<button className="text-button" onClick={() => setReadyTab('final')}>登记最终 PDF <ArrowRight size={15} /></button></div><ResumePreview resume={latestResume} /></>}
     </>}
     {readyTab === 'final' && <>
      {!latestResume ? <Empty>请先生成内容并确认就绪。</Empty> : <div className="real-card"><h2>保存真实最终文件</h2><p>将排版稿在浏览器中打开并打印为 PDF，或在你惯用的工具中排版。检查内容后，把最终 PDF 登记在这里。</p>
       <label>关联的内容版本<select value={latestResume.id} onChange={e => setResumeId(e.target.value)}>{availableResumes.map(r => <option key={r.id} value={r.id}>内容 V{r.version} · {r.plan.name}</option>)}</select></label>
       <label className="real-upload">上传最终 PDF<input type="file" accept=".pdf,application/pdf" aria-label="上传最终 PDF" onChange={e => {const file=e.target.files?.[0]; if(file) void perform(() => service.attach(latestResume.id,file),'最终 PDF 已保存并记录 SHA-256。'); e.target.value='';}} /></label>
      </div>}
      {state.files.filter(f => jobResumes.some(r => r.id === f.resumeId)).map(file => <article className="real-card" key={file.id}><h3><FileText size={18} /> {file.name}</h3><p>来源：内容 V{state.resumes.find(r => r.id === file.resumeId)?.version} · <span className="badge badge-green">{file.used ? '已用于投递 · 永久冻结' : '尚未投递'}</span></p><small className="real-hash">SHA-256：{file.hash}</small>
       <button className="text-button" onClick={() => { void perform(async () => { const bytes=await service.readFile(file.id); download(bytes as BlobPart,'application/pdf',file.name); },'文件完整性检查通过，已导出。'); }}>下载保存的 PDF</button>
       <form className="form-stack" onSubmit={e => submit(e,d => act({type:'record_application',file_id:file.id,channel:field(d,'channel'),note:field(d,'note')},'已登记投递并冻结文件；本操作不会向外发送申请。'))}><label>投递渠道<input name="channel" required maxLength={200} placeholder="公司官网 / 邮件 / 招聘平台" /></label><label>备注<input name="note" maxLength={4000} /></label><button className="button button-secondary">我已投递，登记记录</button></form>
      </article>)}
     </>}
    </>}
   </div>}
   {page === 'library' && <div className="page-enter">
    <div className="section-heading"><div><h1>版本资料库</h1><p>历史内容保持不变，新修改生成新版本。</p></div></div>
    {!state.resumes.length && <Empty>还没有内容版本。完成岗位要求和组合后生成。</Empty>}
    {[...state.resumes].reverse().map(r => <details className="real-card" key={r.id}><summary>{state.jobs.find(j => j.id === r.jobId)?.company} · {state.jobs.find(j => j.id === r.jobId)?.roleTitle} · 内容 V{r.version} · {r.createdAt.slice(0,10)}</summary><ResumePreview resume={r} /><button className="button button-secondary" onClick={() => download(resumeHtml(r),'text/html;charset=utf-8','resume-v'+r.version+'.html')}>导出此版本排版稿</button></details>)}
    <h2>投递记录</h2>
    {state.applications.map(a => <article className="real-card" key={a.id}><h3>{state.jobs.find(j => j.id === a.jobId)?.company} · {state.jobs.find(j => j.id === a.jobId)?.roleTitle}</h3><p>{state.files.find(f => f.id === a.fileId)?.name} · {a.channel} · {a.appliedAt.slice(0,10)}</p><form key={a.id + a.status + a.note} className="real-actions" onSubmit={e => submit(e,d => act({type:'update_application',application_id:a.id,status:field(d,'status'),note:field(d,'note')},'投递状态已更新，文件绑定和冻结保持。'))}><label>状态<select name="status" aria-label="投递状态" defaultValue={a.status}>{[['APPLIED','已投递'],['IN_PROCESS','流程中'],['ENDED','已结束'],['VOIDED','记录作废']].map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label><label>备注<input name="note" defaultValue={a.note} maxLength={4000} /></label><button className="button button-secondary">更新记录</button></form></article>)}
   </div>}
   {page === 'settings' && <div className="page-enter">
    <h1>设置与数据</h1><div className="settings-list">
     <div><strong>用户工作区</strong><p className="storage-path" data-testid="personal-storage-path">{storage?.kind === 'desktop' ? storage.root : '桌面版启动后可查看实际工作区。'}</p><p>如果系统目录链接到其他磁盘，实际文件位于链接目标。个人数据不进入源码仓库。</p></div>
     <div><strong>保存状态</strong><p>职业资产、事实版本、岗位、组合、简历快照和投递记录通过桌面命令保存到 SQLite。演示入口使用独立的合成内存数据。</p></div>
     <div><strong>发送范围</strong><p>只有主动发送才会请求模型，发送前可查看目标接口与本轮所选 JD、事实和问题。密钥只用于你指定接口的认证，不向页面返回完整值。</p></div>
     <div><strong>最终文件</strong><p>PDF 保存到工作区文件夹，数据库记录来源与完整性摘要。用于投递后永久冻结；变更内容请生成新版本并上传新文件。</p></div>
     <div><strong>数据迁移</strong><p>当前不提供自动跨设备迁移。需要备份时请关闭程序，再对完整工作区进行一致性备份，不只复制 app.db。</p></div>
    </div>
    <AiSettings service={aiService} onSaved={()=>setConfigurationVersion(v=>v+1)}/>
   </div>}
   </fieldset>}
   <footer className="workspace-footer"><span><ShieldCheck size={14} />真实经历 · 显式确认 · 历史保留</span><span>{busy ? '正在保存…' : '个人工作区'}</span></footer>
   </main>
  </div>
  <RealAssistant service={aiService} state={state} open={assistantOpen} onClose={()=>setAssistantOpen(false)} currentJob={job} pageLabel={navigation.find(n=>n.id===page)?.title??'设置与数据'} intent={aiIntent} configurationVersion={configurationVersion} onSettings={()=>setPage('settings')} onApplied={load} guardApply={target=>{
   if(target.type==='job'&&target.jobId){
    const current=state.analyses.filter(a=>a.jobId===target.jobId).at(-1)?.requirements.join('\n')??'';
    if(requirementsDraft[target.jobId]!==undefined&&requirementsDraft[target.jobId]!==current)throw new Error('目标岗位有未保存的手工修改，请先保存或恢复原要求，再生成建议。');
   }
  }}/>
  {notice && <div className={'toast '+(notice.error?'toast-error':'')} role={notice.error?'alert':'status'}><span>{notice.text}</span><button aria-label="关闭提示" onClick={() => setNotice(null)}><X size={16}/></button></div>}
  {(modal || review || editFact) && <Modal title={review?'审查事实':editFact?'修订事实':modal==='asset'?'新增职业资产':'新增岗位'} onClose={() => {if(!busy){setModal(null);setReview(null);setEditFact(null);}}}><fieldset className="real-fields" disabled={busy || !service.native}>
   {modal==='asset' && <form className="form-stack" onSubmit={e => submit(e,d => act({type:'add_asset',organization:field(d,'organization'),role:field(d,'role'),title:field(d,'title'),summary:field(d,'summary')},'职业资产已保存；继续添加并审查事实。'),()=>{setModal(null);setPage('assets');})}><label>机构 / 团队<input name="organization" required maxLength={200}/></label><label>职位 / 角色<input name="role" maxLength={200}/></label><label>项目 / 贡献名称<input name="title" required maxLength={200}/></label><label>经历描述<textarea name="summary" required maxLength={12000} rows={5}/></label><p className="muted">描述作为背景保存，不自动成为可信事实。</p><button className="button button-primary">保存职业资产</button></form>}
   {modal==='job' && <form className="form-stack" onSubmit={e => submit(e,async d => {let created='';const ok=await perform(async()=>{const result=await service.execute({type:'add_job',company:field(d,'company'),role_title:field(d,'role'),jd:field(d,'jd')});created=result.id??'';},'目标岗位已保存。');if(ok)switchJob(created);return ok;},()=>{setModal(null);setPage('jobs');})}><label>公司<input name="company" required maxLength={200}/></label><label>岗位名称<input name="role" required maxLength={200}/></label><label>岗位描述 JD<textarea name="jd" required maxLength={40000} rows={8}/></label><button className="button button-primary">保存目标岗位</button></form>}
   {review && <form className="form-stack" onSubmit={e => submit(e,d => act({type:'review_fact',fact_id:review.id,expected_revision_id:review.revisionId,confirmed:d.get('confirmed')==='on',risk_acknowledged:d.get('risk')==='on'},'事实已确认，新版本已保存。'),()=>setReview(null))}><blockquote>{review.content}</blockquote><p>个人职责：{owners.find(o=>o[0]===review.ownership)?.[1]}</p><label className="real-choice"><input type="checkbox" name="confirmed" required/><span>我确认这是自己真实经历的准确表达。</span></label>{review.risk==='HIGH' && <label className="real-choice"><input type="checkbox" name="risk" required/><span>我已单独核实其中的数字、规模和个人职责，没有把团队成果说成个人主导。</span></label>}<p className="muted">这是用户确认，不等于证据已验证。之后修改文字会重新进入待审查。</p><button className="button button-primary"><Check size={15}/>确认此事实</button></form>}
   {editFact && <form className="form-stack" onSubmit={e=>submit(e,d=>act({type:'revise_fact',fact_id:editFact.id,expected_revision_id:editFact.revisionId,content:field(d,'content'),ownership:field(d,'ownership')},'新修订已保存为待审查，旧版本与历史简历保留。'),()=>setEditFact(null))}><label>事实文字<textarea name="content" required maxLength={4000} rows={5} defaultValue={editFact.content}/></label><label>个人职责<select name="ownership" defaultValue={editFact.ownership}>{owners.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><p>修改会创建新的待审查版本，不覆盖已确认的历史内容。</p><button className="button button-primary">保存新修订</button></form>}
  </fieldset></Modal>}
 </div>;
}
