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

export function FactEvidence({ fact, state, save, open }: { fact: Fact; state: CareerState; save: Save; open: OpenEvidence }) {
 const files = state.evidence.filter(file => file.contributionId === fact.contributionId);
 const links = state.evidenceLinks.filter(link => link.revisionId === fact.revisionId);
 const alias = state.factAliases.find(item => item.factId === fact.id)?.alias ?? '';
 const resumes = state.resumes.filter(resume => resume.plan.items.some(item => item.revisionId === fact.revisionId));
 const target = { fact_id: fact.id, expected_revision_id: fact.revisionId };
 return <details className="real-evidence-map">
  <summary>事实与证据 · {links.length} 份关联</summary>
  <div className="real-evidence-columns">
   <section><h4>佐证原件</h4>
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
   <span className="real-evidence-arrow" aria-hidden="true">→</span>
   <section><h4>事实 V{fact.revision}</h4><p>{alias || fact.content}</p>
    {alias && <small>原文：{fact.content}</small>}
    <NodeAlias label="事实别名" alias={alias} onSave={value => void save({type:'rename_fact_node',fact_id:fact.id,alias:value},'事实别名已保存。')} />
   </section>
   <span className="real-evidence-arrow" aria-hidden="true">→</span>
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
