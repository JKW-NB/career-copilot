import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import { errorMessage, type CareerState, type Job } from '../application/career-service';
import { type AiService, type AiResponse, type AiRequest, type ProviderStatus, type ProposalTarget } from '../application/ai-service';
export interface AiIntent { sequence: number; jobId: string }
interface Turn { id: string; question: string; response: AiResponse; targetLabel: string; destination: string; status: 'pending' | 'applied' | 'dismissed' }
export function RealAssistant({ service, state, open, onClose, currentJob, pageLabel, intent, configurationVersion, onSettings, onApplied, guardApply }: {
 service: AiService; state: CareerState; open: boolean; onClose: ()=>void; currentJob?: Job; pageLabel: string;
 intent?: AiIntent; configurationVersion: number; onSettings: ()=>void; onApplied: ()=>Promise<void>; guardApply: (target: ProposalTarget)=>void;
}) {
 const [status,setStatus]=useState<ProviderStatus>();
 const [mode,setMode]=useState<'assistant'|'job_analysis'>('assistant');
 const [jobId,setJobId]=useState(currentJob?.id??'');
 const [includeJob,setIncludeJob]=useState(false);
 const [selected,setSelected]=useState<string[]>([]);
 const [targetFact,setTargetFact]=useState('');
 const [question,setQuestion]=useState('');
 const [includeHistory,setIncludeHistory]=useState(false);
 const [turns,setTurns]=useState<Turn[]>([]);
 const [pending,setPending]=useState(false);
 const [applying,setApplying]=useState('');
 const [error,setError]=useState('');
 const bottom=useRef<HTMLDivElement>(null);
 const facts=state.facts.filter(f=>f.state==='ACTIVE'&&state.assets.some(a=>a.id===f.contributionId));
 const contextJob=state.jobs.find(j=>j.id===jobId);
 useEffect(()=>{setJobId(currentJob?.id??'');},[currentJob?.id]);
 useEffect(()=>{
  if(!intent)return;
  setMode('job_analysis');setJobId(intent.jobId);setIncludeJob(true);setSelected([]);setTargetFact('');setIncludeHistory(false);
  setQuestion('请根据该岗位 JD 分析需要证明的核心能力及重要性。');setError('');
 },[intent]);
 useEffect(()=>{
  let active=true;
  if(open&&service.native)service.status().then(s=>{if(active)setStatus(s);}).catch(e=>{if(active)setError(errorMessage(e));});
  return()=>{active=false;};
 },[service,open,configurationVersion]);
 useEffect(()=>{
  const ids=new Set(state.facts.filter(f=>f.state==='ACTIVE').map(f=>f.revisionId));
  setSelected(old=>old.filter(id=>ids.has(id)));
  if(targetFact&&!state.facts.some(f=>f.id===targetFact&&f.state==='ACTIVE'))setTargetFact('');
 },[state.facts,targetFact]);
 useEffect(()=>{if(open)bottom.current?.scrollIntoView({block:'nearest'});},[turns,pending,open]);
 const selectedFacts=facts.filter(f=>selected.includes(f.revisionId));
 const selectedTarget=facts.find(f=>f.id===targetFact);
 const history=includeHistory&&mode==='assistant'?turns.slice(-2).flatMap(t=>[{role:'user' as const,content:t.question},{role:'assistant' as const,content:t.response.output.answer??JSON.stringify(t.response.output)}]):[];
 const request: AiRequest={expectedBaseUrl:status?.config?.baseUrl??'',task:mode,question,jobId:(mode==='job_analysis'||includeJob)?contextJob?.id??null:null,factRevisionIds:mode==='assistant'?selectedFacts.map(f=>f.revisionId):[],targetFactId:mode==='assistant'?selectedTarget?.id??null:null,history};
 const send=async()=>{
  if(pending)return;
  if(!status?.config||!status.hasKey){setError('请先在设置中保存接口和密钥。');return;}
  if(!question.trim()){setError('请填写本次问题。');return;}
  if(mode==='job_analysis'&&!contextJob){setError('请先选择要分析的岗位。');return;}
  setPending(true);setError('');
  const destination=status.config.baseUrl;
  const label=mode==='job_analysis'?(contextJob?.company+' > '+contextJob?.roleTitle+' > 能力要求'):selectedTarget?(state.assets.find(a=>a.id===selectedTarget.contributionId)?.title+' > 事实描述'):'本轮解释与分析';
  try{
   const response=await service.generate(request);
   setTurns(old=>[...old,{id:response.id,question,response,targetLabel:label,destination,status:'pending'}]);
   setQuestion('');
  }catch(e){setError(errorMessage(e));}finally{setPending(false);}
 };
 const apply=async(turn:Turn)=>{
  if(applying)return;
  setApplying(turn.id);setError('');
  try{
   guardApply(turn.response.target);
   await service.apply(turn.id);
   setTurns(old=>old.map(t=>t.id===turn.id?{...t,status:'applied'}:t));
   try{await onApplied();}catch{setError('修改已应用，但刷新失败，请重新打开工作区查看。');}
  }catch(e){setError(errorMessage(e));}finally{setApplying('');}
 };
 const dismiss=async(turn:Turn)=>{
  if(applying)return;
  setApplying(turn.id);setError('');
  try{await service.dismiss(turn.id);setTurns(old=>old.map(t=>t.id===turn.id?{...t,status:'dismissed'}:t));}
  catch(e){setError(errorMessage(e));}finally{setApplying('');}
 };
 return <aside className="ai-side-panel real-ai" aria-label="个人 AI 助手面板" hidden={!open}>
  <header className="ai-panel-header"><div><Sparkles size={18}/><h2>AI 助手</h2></div><button className="icon-button" aria-label="收起个人 AI 助手" onClick={onClose}><X size={19}/></button></header>
  <section className="ai-current-context">
   <span className="field-label">当前页面：{pageLabel}</span>
   <p className="real-ai-destination">发送至：{status?.config?.baseUrl??'尚未配置接口'}</p>
   {(!status?.config||!status.hasKey)&&<button className="text-button" onClick={onSettings}>前往设置模型</button>}
   <label>本轮任务<select aria-label="AI 本轮任务" value={mode} disabled={pending} onChange={e=>{setMode(e.target.value as typeof mode);setIncludeJob(false);setIncludeHistory(false);setTargetFact('');setSelected([]);setError('');}}>
    <option value="assistant">提问 / 事实改写建议</option><option value="job_analysis">分析岗位能力要求</option>
   </select></label>
   <label>岗位上下文<select aria-label="AI 岗位上下文" value={jobId} disabled={pending} onChange={e=>setJobId(e.target.value)}><option value="">不选择岗位</option>{state.jobs.map(j=><option key={j.id} value={j.id}>{j.company} · {j.roleTitle}</option>)}</select></label>
   {mode==='assistant'&&<>
    <label className="real-ai-check"><input type="checkbox" checked={includeJob} disabled={pending||!contextJob} onChange={e=>setIncludeJob(e.target.checked)}/>发送所选岗位 JD</label>
    <label>修改目标（可选）<select aria-label="AI 事实修改目标" value={targetFact} disabled={pending} onChange={e=>{
     const f=facts.find(f=>f.id===e.target.value);setTargetFact(e.target.value);
     if(f)setSelected(old=>old.includes(f.revisionId)?old:[...old,f.revisionId]);
    }}><option value="">仅回答，不修改内容</option>{facts.map(f=><option value={f.id} key={f.id}>{state.assets.find(a=>a.id===f.contributionId)?.title}：{f.content.slice(0,32)}</option>)}</select></label>
    <details><summary>选择事实上下文（{selectedFacts.length}/20）</summary><div className="real-ai-facts">{facts.length===0?<p>还没有可选择的事实。</p>:facts.map(f=><label className="real-ai-check" key={f.revisionId}><input type="checkbox" aria-label={'发送事实：'+f.content} checked={selected.includes(f.revisionId)} disabled={pending||(selected.length>=20&&!selected.includes(f.revisionId))||f.id===targetFact} onChange={e=>setSelected(old=>e.target.checked?[...old,f.revisionId]:old.filter(id=>id!==f.revisionId))}/><span>{f.content}<small>{f.verification==='USER_CONFIRMED'?'用户已确认':'待审查，不作为已验证依据'}</small></span></label>)}</div></details>
    <label className="real-ai-check"><input type="checkbox" checked={includeHistory} disabled={pending||turns.length===0} onChange={e=>setIncludeHistory(e.target.checked)}/>附带最近两轮对话</label>
   </>}
   <details><summary>查看将发送的内容</summary><pre className="real-ai-payload">{JSON.stringify({question,job:(mode==='job_analysis'||includeJob)?contextJob?.jd:null,facts:mode==='assistant'?selectedFacts.map(f=>({content:f.content,ownership:f.ownership,verification:f.verification})):[],rewriteTarget:selectedTarget?.content??null,history},null,2)}</pre></details>
  </section>
  <div className="ai-conversation" aria-live="polite">
   {!turns.length&&<div className="ai-welcome"><h3>围绕当前工作提问</h3><p>先选择上下文，再主动发送。AI 回答不会自动写入资产或简历。</p><small>事实改写应用后仍需审查；不发送整份资料库、联系人或最终 PDF。</small></div>}
   {turns.map(turn=><article className="chat-turn" key={turn.id}>
    <div className="ai-user-message">{turn.question}</div><p className="real-ai-meta">{turn.targetLabel}<br/>接口：{turn.destination}</p>
    <div className="ai-answer">{turn.response.output.answer??'以下是根据本次岗位原文整理的能力要求建议：'}</div>
    {turn.response.output.requirements&&<ol>{turn.response.output.requirements.map((r,i)=><li key={i}>{r}</li>)}</ol>}
    {turn.response.canApply&&<div className="proposal">
     <strong>应用到：{turn.targetLabel}</strong>
     {turn.response.output.suggestedText&&<p className="ai-preview">{turn.response.output.suggestedText}</p>}
     {turn.status==='pending'?<><p>{turn.response.target.type==='fact'?'应用后会创建待审查修订；确认过的旧版本和历史简历保留。':'应用后保存新的岗位要求版本，已确认的历史组合保留。'}</p><div className="ai-proposal-actions"><button className="button button-primary" disabled={!!applying} onClick={()=>void apply(turn)}>应用修改</button><button className="button button-secondary" disabled={!!applying} onClick={()=>void dismiss(turn)}>暂不应用</button></div></>:<span className="badge badge-green">{turn.status==='applied'?(turn.response.target.type==='fact'?'已应用 · 待审查':'已应用'):'暂不应用 · 已保留原内容'}</span>}
    </div>}
   </article>)}
   {pending&&<p>正在请求模型…你仍可操作当前页面。</p>}
   <div ref={bottom}/>
  </div>
  <footer className="ai-composer">
   {error&&<p className="ai-error" role="alert">{error}</p>}
   <div className="ai-shortcuts"><button disabled={pending} onClick={()=>setQuestion(mode==='job_analysis'?'请分析该岗位需要证明的能力，并说明重要性。':'请帮我找出所选事实中需要核实或补充的内容。')}>找出待补充点</button><button disabled={pending||mode!=='assistant'||!selectedTarget} onClick={()=>setQuestion('请只基于选中的事实改写措辞，不新增数字、不提升个人职责。')}>改写所选事实</button></div>
   <form onSubmit={e=>{e.preventDefault();void send();}}>
    <textarea aria-label="发送给个人 AI 助手的问题" value={question} disabled={pending} onChange={e=>setQuestion(e.target.value)} rows={3} maxLength={4000} placeholder="针对选中的内容提问或请求修改…" required/>
    <div className="ai-input-footer"><small>仅发送本轮选择的内容</small><button className="button button-primary" disabled={pending||!service.native||!status?.hasKey}><Send size={14}/>{pending?'请求中':'发送'}</button></div>
   </form>
  </footer>
 </aside>;
}
