import { useEffect, useState } from 'react';
import { Archive, ArrowRight, ArrowUpRight, Check, FileCheck2, FileText, FolderOpen, Leaf, LockKeyhole, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { contributions, facts, getContribution, getFact } from '../demo/fixtures';
import { loadStorageInfo, type StorageInfo } from '../infrastructure/storage';
import { Badge, EmptyState, FactStatus, type PageProps } from './shared';

export function Assets({ state, inspect, newAsset, askAssistant }: PageProps) {
  const [query, setQuery] = useState('');
  const matches = contributions.filter(item => [item.title, item.organization, state.descriptions[item.id], ...item.facts.map(id => getFact(id).text)].join(' ').toLowerCase().includes(query.toLowerCase()));
  return <div className="page-enter standalone-page"><div className="section-heading"><div><span className="section-overline">CAREER ASSETS</span><h1>职业资产</h1><p>管理经历、贡献、事实与待审查草稿。</p></div><button className="button button-primary" onClick={newAsset}>＋ 新增资产</button><div className="asset-count"><strong>{contributions.length + state.assetDrafts.length}</strong><span>项贡献</span><strong>{facts.length}</strong><span>条事实</span></div></div>
    <label className="search-input"><Search size={17} /><input aria-label="搜索职业资产" placeholder="搜索贡献、事实或机构…" value={query} onChange={event => setQuery(event.target.value)} /><kbd>查找资产</kbd></label>
    <div className="asset-list">{state.assetDrafts.filter(item => [item.title, item.organization, item.summary].join(' ').toLowerCase().includes(query.toLowerCase())).map(item => <article className="asset-card" key={item.id} data-testid={item.id} data-ai-target={`draft:${item.id}`}><Badge tone="orange">待审查草稿</Badge><h2>{item.title}</h2><p className="muted">{item.organization}</p><p>{item.summary}</p><button className="text-button" onClick={() => askAssistant(`资产草稿「${item.title}」：${item.summary}`, `draft:${item.id}`)}>加入上下文，询问 AI</button><p className="muted">描述尚未转为可信事实，不用于简历编译。</p></article>)}</div>
    <div className="asset-list">{matches.map(contribution => <article className="asset-card" key={contribution.id} data-ai-target={`description:${contribution.id}`}><div className="asset-card-top"><span className={`mini-symbol accent-${contribution.color}`}><FolderOpen size={21} /></span><div><span className="eyebrow">{contribution.organization} / {contribution.project}</span><h2>{contribution.title}</h2><p>{state.descriptions[contribution.id]}</p></div><button className="icon-button" aria-label={`查看${contribution.title}详情`} onClick={() => inspect({ kind: 'contribution', id: contribution.id })}><ArrowUpRight size={19} /></button></div><div className="asset-facts">{contribution.facts.map(id => { const fact = getFact(id); return <button key={id} className="asset-fact" onClick={() => inspect({ kind: 'fact', id })}><FileText size={15} /><span>{fact.text}</span><FactStatus fact={fact} /><ArrowUpRight size={14} /></button>; })}</div></article>)}</div>
    {!matches.length && !state.assetDrafts.some(item => [item.title, item.organization, item.summary].join(' ').toLowerCase().includes(query.toLowerCase())) && <p className="inline-empty">没有找到相关资产，换一个关键词试试。</p>}
    <div className="notice notice-subtle"><ShieldCheck size={18} /><p>初始材料为合成演示数据；新增草稿仅保留在当前会话。真实文件导入、材料解析和访谈将在后续任务接入。</p></div>
  </div>;
}
export function Final({ state, service, run, goTab }: PageProps) {
  const latest = state.ready.at(-1);
  if (!latest) return <EmptyState title="尚无已确认内容" action={<button className="button button-primary" onClick={() => goTab('resume')}>返回简历内容 <ArrowRight size={16} /></button>}>Final 用于记录最终文件和真实投递。Demo 会用虚拟文件演示这个流程。</EmptyState>;
  return <div className="page-enter"><div className="section-heading top-heading"><div><span className="section-overline">FINAL FILES</span><h2>最终版本</h2><p>管理内容版本、最终文件与投递记录。</p></div><Badge tone="green"><Check size={12} />内容已就绪</Badge></div>
    <div className="ready-summary"><span className="ready-icon"><FileCheck2 size={25} /></span><div><span className="eyebrow">CONTENT READY</span><h3>简历内容 V{latest.version}</h3><p>基于组合 V{latest.basedOnVersion} · {latest.items.length} 个内容单元 · 稳定快照</p></div><button className="text-button" onClick={() => goTab('resume')}>回到工作草稿 <ArrowUpRight size={15} /></button></div>
    <div className="final-intro"><h3>外部排版与文件登记</h3><p>复制内容到超级简历等工具，完成后再保存最终 PDF。此处仅演示记录流程，不上传或生成真实文件。</p><button className="button button-primary" onClick={() => run(() => service.saveFinalSample(), '已保存虚拟文件样例，没有生成真实 PDF。')}><FileText size={16} />保存最终文件样例</button></div>
    <div className="list-heading"><h3>最终文件 <span>{state.files.length}</span></h3><span>虚拟文件 · 不代表真实投递</span></div>
    {state.files.map(file => <article className="final-file" key={file.id}><div className="pdf-icon">PDF</div><div className="file-description"><h3>{file.name}</h3><p>Resume-demo.pdf · 基于内容 V{file.contentVersion}</p><div className="inline-badges"><Badge tone={file.used ? 'green' : 'neutral'}>{file.used ? '模拟已投递 · 永久冻结' : '未使用'}</Badge>{file.status === 'ARCHIVED' && <Badge>已归档</Badge>}</div></div><div className="file-actions">{!file.used && <button className="button button-secondary" onClick={() => run(() => service.markApplied(file.id), '已模拟投递并冻结样例；未发送任何实际申请。')}>模拟投递 <ArrowUpRight size={15} /></button>}<button className="text-button" onClick={() => run(() => service.replaceFinal(file.id), '未使用样例已重新绑定最新 Ready 内容。')}>{file.used && <LockKeyhole size={14} />}尝试替换</button>{file.status !== 'ARCHIVED' && <button className="text-button" onClick={() => run(() => service.archiveFinal(file.id), '已归档，使用锁与来源关系保留。')}><Archive size={14} />归档</button>}</div></article>)}
    <div className="notice notice-subtle"><LockKeyhole size={18} /><p>已使用文件永久冻结，即使归档也不能覆盖。要换内容，请保存一个新版本。</p></div>
  </div>;
}
export function Home({ goTab }: PageProps) {
  return <div className="standalone-page page-enter"><span className="eyebrow">今日概览</span><h1 className="home-title">JKai 的工作概览</h1><p className="home-intro">让真实经历，成为你的下一步。</p><div className="home-feature"><div><Badge tone="green">正在准备 · 演示岗位</Badge><h2>星河科技 · AI 产品实习生</h2><p>策略已准备好。从审核证明责任开始，选出最能支持你的经历。</p><button className="button button-primary" onClick={() => goTab('strategy')}>继续岗位工作区 <ArrowRight size={16} /></button></div><Leaf size={95} strokeWidth={0.8} /></div><div className="home-note"><Sparkles size={20} /><div><h3>待办：审核岗位策略</h3><p>检查能力重要性与缺口，然后确认贡献组合。</p></div></div></div>;
}
export function Library({ state, inspect, goTab }: PageProps) {
  return <div className="standalone-page page-enter"><div className="section-heading"><div><span className="section-overline">VERSION LIBRARY</span><h1>版本资料库</h1><p>查看已确认的内容快照与文件记录。</p></div><Badge>演示会话</Badge></div>
    {!state.ready.length ? <EmptyState title="尚无内容版本" action={<button className="button button-primary" onClick={() => goTab('resume')}>继续准备简历 <ArrowRight size={16} /></button>}>在简历页确认内容后，就可以在这里查看稳定快照。</EmptyState> : state.ready.map(ready => <article className="library-version" key={ready.version}><div className="library-version-heading"><span className="version-node">V{ready.version}</span><div><h2>星河科技 · 内容 V{ready.version}</h2><p>基于组合 V{ready.basedOnVersion} · {state.files.filter(file => file.contentVersion === ready.version).length} 个样例文件</p></div><Badge tone="green">CONTENT READY</Badge></div>{ready.items.map(item => <button className="library-item" key={item.id} onClick={() => inspect({ kind: 'contribution', id: item.contributionId })}><strong>{getContribution(item.contributionId).title}</strong><span>{item.text}</span><ArrowUpRight size={16} /></button>)}</article>)}
    {state.files.length > 0 && <button className="button button-secondary" onClick={() => goTab('final')}>查看最终文件记录 <ArrowRight size={16} /></button>}
  </div>;
}
export function Settings() {
  const [storage, setStorage] = useState<StorageInfo>();
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    loadStorageInfo().then(setStorage).catch(() => setStorageError(true));
  }, []);
  const storageDetail = storageError
    ? '本地存储初始化失败，请重新启动应用。'
    : storage?.kind === 'desktop'
      ? storage.root
      : storage?.message ?? '正在读取本地数据位置…';
  const databaseDetail = storage?.kind === 'desktop'
    ? `app.db · Schema V${storage.schemaVersion} · Workspace ${storage.workspaceId}`
    : '桌面版启动后创建 app.db；当前浏览器演示不会写入磁盘。';
  return <div className="standalone-page page-enter"><span className="section-overline">APP SETTINGS</span><h1>设置与数据</h1><p className="muted">查看桌面工作区位置和当前实现边界。</p><div className="settings-list">
    <div><strong>应用数据目录</strong><p className="storage-path" data-testid="storage-path">{storageDetail}</p></div>
    <div><strong>本地数据库</strong><p data-testid="workspace-id">{databaseDetail}</p></div>
    <div><strong>当前界面数据</strong><p>桌面 Storage 基础设施已经建立；现有演示资产仍保留在页面内存中，M0-T3 后才接入受信任业务命令。</p></div>
    <div><strong>迁移到其他设备</strong><p>程序可以重新安装，数据不会自动跟随。如需跨设备迁移，需要后续增加受控导出与导入；当前不要直接复制运行中的数据库。</p></div>
    <div><strong>模型连接</strong><p>未连接任何 AI Provider；推荐与改写仍使用固定场景。</p></div>
    <div><strong>文件与隐私</strong><p>当前不读取或上传个人文件，也不保存 API Key。</p></div>
  </div></div>;
}
