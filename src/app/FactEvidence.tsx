import { useId } from 'react';
import { type Action, type CareerState, type Fact, type Resume } from '../application/career-service';

type Save = (action: Action, message: string) => Promise<boolean>;
type OpenEvidence = (id: string, name: string) => Promise<boolean>;

export function NodeAlias({ label, alias, onSave }: { label: string; alias: string; onSave: (alias: string) => void }) {
 return <form className="real-actions" onSubmit={event => {
  event.preventDefault();
  onSave(String(new FormData(event.currentTarget).get('alias') ?? ''));
 }}>
  <label>{label}<input name="alias" defaultValue={alias} maxLength={80} placeholder="留空恢复原名" /></label>
  <button className="button button-secondary">保存别名</button>
 </form>;
}

export function EvidenceCanvas({ assetId, state, open }: { assetId: string; state: CareerState; open: OpenEvidence }) {
 const arrowId = useId();
 const files = state.evidence.filter(file => file.contributionId === assetId);
 const facts = state.facts.filter(fact => fact.contributionId === assetId);
 const factRows = new Map(facts.map((fact, index) => [fact.revisionId, index]));
 const fileRows = new Map(files.map((file, index) => [file.id, index]));
 const references = state.resumes.flatMap(resume => resume.plan.items.flatMap((item, index) =>
  factRows.has(item.revisionId) ? [{resume, item, index}] : []));
 if (!files.length && !facts.length) return null;
 const height = 88 * Math.max(files.length, facts.length, references.length, 1);
 const line = (from: number, to: number, boundary: number, key: string) => {
  const y1 = from * 88 + 32;
  const y2 = to * 88 + 32;
  return <path key={key} d={`M ${boundary - 30} ${y1} C ${boundary} ${y1}, ${boundary} ${y2}, ${boundary + 30} ${y2}`}
   vectorEffect="non-scaling-stroke" />;
 };
 return <details className="real-evidence-map">
  <summary>证据关系画布</summary>
  <div className="evidence-canvas-scroll" tabIndex={0} role="region" aria-label="证据关系画布，可横向滚动">
   <div className="evidence-canvas">
    <div className="evidence-lanes">
     <section aria-label="佐证原件"><h4>佐证原件</h4>
      {files.map(file => <button key={file.id} className="evidence-node" type="button" title={file.name}
       onClick={() => void open(file.id, file.name)}><strong>{file.alias || file.name}</strong></button>)}
     </section>
     <section aria-label="事实版本"><h4>事实版本</h4>
      {facts.map(fact => <div className="evidence-node" key={fact.revisionId} title={fact.content}>
       <strong>{state.factAliases.find(alias => alias.factId === fact.id)?.alias || fact.content}</strong><small>V{fact.revision}</small>
      </div>)}
     </section>
     <section aria-label="简历引用"><h4>简历引用</h4>
      {references.map(({resume, item, index}) => <div className="evidence-node" key={resume.id + ':' + index} title={item.text}>
       <strong>{item.text}</strong><small>{state.jobs.find(job => job.id === resume.jobId)?.roleTitle ?? '岗位简历'} · 内容 V{resume.version}</small>
      </div>)}
     </section>
    </div>
    <svg className="evidence-edges" viewBox={`0 0 900 ${height}`} preserveAspectRatio="none" height={height} aria-hidden="true">
     <defs><marker id={arrowId} markerWidth="5" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="userSpaceOnUse">
      <path d="M 0 0 L 5 3 L 0 6 Z" fill="#527a64" />
     </marker></defs>
     <g fill="none" stroke="#527a64" strokeWidth="1.5" markerEnd={`url(#${arrowId})`}>
      {state.evidenceLinks.map(link => {
       const from = fileRows.get(link.evidenceId);
       const to = factRows.get(link.revisionId);
       return from !== undefined && to !== undefined && line(from, to, 300, link.evidenceId + ':' + link.revisionId);
      })}
      {references.map(({resume, item, index}, row) => line(factRows.get(item.revisionId)!, row, 600, resume.id + ':' + index))}
     </g>
    </svg>
   </div>
  </div>
 </details>;
}

export function FactEvidence({ fact, state, save, open }: { fact: Fact; state: CareerState; save: Save; open: OpenEvidence }) {
 const files = state.evidence.filter(file => file.contributionId === fact.contributionId);
 const links = state.evidenceLinks.filter(link => link.revisionId === fact.revisionId);
 const alias = state.factAliases.find(item => item.factId === fact.id)?.alias ?? '';
 const resumes = state.resumes.filter(resume => resume.plan.items.some(item => item.revisionId === fact.revisionId));
 const target = { fact_id: fact.id, expected_revision_id: fact.revisionId };
 return <details className="real-evidence-map">
  <summary>事实与证据 · {links.length} 份关联</summary>
  <div>
   <section>
    {links.length ? <ul>{links.map(link => {
     const file = files.find(item => item.id === link.evidenceId);
     if (!file) return null;
     return <li key={file.id}>
      <button className="text-button" type="button" onClick={() => void open(file.id, file.name)}>{file.alias || file.name}</button>
      {file.alias && <small> 原件：{file.name}</small>}
      <p>{link.locator || '未填写位置'} · {link.checked ? '已核对' : '待核对'}</p>
      {fact.state === 'ACTIVE' && <div className="real-actions">
       <button type="button" className="text-button" onClick={() => void save({ type:'set_fact_evidence', ...target, evidence_id:file.id, locator:link.locator, checked:!link.checked }, '关联核对状态已更新。')}>{link.checked ? '改为待核对' : '标记已核对'}</button>
       <button type="button" className="text-button" onClick={() => void save({ type:'remove_fact_evidence', ...target, evidence_id:file.id }, '当前关联已移除。')}>移除关联</button>
      </div>}
     </li>;
    })}</ul> : <p>尚未关联佐证。</p>}
   </section>
   <section>
    <NodeAlias label="事实别名" alias={alias} onSave={value => void save({type:'rename_fact_node',fact_id:fact.id,alias:value},'事实别名已保存。')} />
   </section>
   <section><h4>简历引用</h4>
    {resumes.length ? <ul>{resumes.map(resume => <li key={resume.id}>{state.jobs.find(job => job.id === resume.jobId)?.roleTitle ?? '岗位简历'} · 内容 V{resume.version}</li>)}</ul> : <p>此事实版本尚未被简历引用。</p>}
   </section>
  </div>
  {fact.state === 'ACTIVE' && files.length > 0 && <form className="form-stack" onSubmit={async event => {
   event.preventDefault();
   const form = event.currentTarget;
   const data = new FormData(form);
   if (await save({type:'set_fact_evidence',...target,evidence_id:String(data.get('file')),locator:String(data.get('locator') ?? ''),checked:false},'证据关联已保存，可打开原件核对。')) form.reset();
  }}>
   <label>关联材料<select name="file" aria-label="关联材料" required defaultValue=""><option value="">选择同一资产下的材料</option>{files.map(file => <option value={file.id} key={file.id}>{file.alias || file.name}</option>)}</select></label>
   <label>证据位置（可选）<input name="locator" maxLength={500} placeholder="例如 PDF 第 4 页、PPT 第 3 页、工作表名称或摘录" /></label>
   <button className="button button-secondary">保存证据关联</button>
  </form>}
 </details>;
}

export function ResumeEvidence({ resume, open }: { resume: Resume; open: OpenEvidence }) {
 return <section className="real-evidence-map">
  <h3>事实与证据快照</h3>
  {resume.plan.items.some(item => item.evidence?.length) ? <ul>{resume.plan.items.filter(item => item.evidence?.length).map((item, index) => <li key={index}>
   <p>{item.text}</p>
   <ul>{item.evidence?.map(file => <li key={file.evidenceId}>
    <button className="text-button" type="button" onClick={() => void open(file.evidenceId, file.name)}>{file.alias || file.name}</button>
    <small> {file.locator || '未填写位置'} · {file.checked ? '已核对' : '待核对'}</small>
   </li>)}</ul>
  </li>)}</ul> : <p>此版本没有保存证据关联快照。</p>}
 </section>;
}
