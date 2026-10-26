import { useEffect, useState } from 'react';
import { type AiService, type ProviderStatus } from '../application/ai-service';
import { errorMessage } from '../application/career-service';

export function AiSettings({ service, onSaved }: { service: AiService; onSaved: () => void }) {
 const [status,setStatus] = useState<ProviderStatus>();
 const [busy,setBusy] = useState(false);
 const [message,setMessage] = useState('');
 const [error,setError] = useState(false);
 useEffect(() => {
  let active=true;
  if(service.native) service.status().then(s => {if(active)setStatus(s);}).catch(e=>{if(active){setMessage(errorMessage(e));setError(true);}});
  return()=>{active=false;};
 },[service]);
 const work = async (operation:()=>Promise<void>) => {
  if(busy)return;
  setBusy(true);setMessage('');setError(false);
  try{await operation();}catch(e){setMessage(errorMessage(e));setError(true);}finally{setBusy(false);}
 };
 return <section className="real-card">
  <h2>模型连接</h2><p>支持兼容 Chat Completions 的 JSON 接口。保存设置不会发送请求；连接测试只发送固定测试文本。</p>
  <fieldset className="real-fields" disabled={busy || !service.native}>
   <form key={JSON.stringify(status?.config)} className="form-stack" onSubmit={event=>{
    event.preventDefault();const form=event.currentTarget;const data=new FormData(form);
    const config={baseUrl:String(data.get('baseUrl')??''),defaultModel:String(data.get('defaultModel')??''),highQualityModel:String(data.get('highQualityModel')??'')};
    const key=String(data.get('apiKey')??'');
    void work(async()=>{setStatus(await service.configure(config,key));form.reset();onSaved();setMessage('设置已保存。密钥只保存在系统凭据中，没有发起模型请求。');});
   }}>
    <label>接口基础地址<input name="baseUrl" required type="url" maxLength={2000} defaultValue={status?.config?.baseUrl??''} placeholder="https://你的模型服务地址/v1" autoComplete="off"/></label>
    <div className="real-form-grid"><label>默认模型<input name="defaultModel" required maxLength={200} defaultValue={status?.config?.defaultModel??''} placeholder="填写模型 ID"/></label><label>高质量模型<input name="highQualityModel" required maxLength={200} defaultValue={status?.config?.highQualityModel??''} placeholder="用于岗位分析，可与默认模型相同"/></label></div>
    <label>API Key<input name="apiKey" type="password" maxLength={4000} autoComplete="new-password" placeholder={status?.hasKey?'当前接口已保存密钥；留空保持不变':'填写当前接口的 API Key'}/></label>
    <p className="muted">密钥绑定当前工作区和接口地址。换接口需为新地址单独保存密钥，不会把旧接口密钥带到新地址。</p>
    <button className="button button-primary">保存模型设置</button>
   </form>
   <div className="real-actions">
    <span className={'badge '+(status?.hasKey?'badge-green':'badge-orange')}>{status?.hasKey?'当前接口密钥已保存':'当前接口未保存密钥'}</span>
    <button className="button button-secondary" disabled={!status?.config || !status.hasKey} onClick={()=>void work(async()=>{
     if(!status?.config)return;
     await service.generate({expectedBaseUrl:status.config.baseUrl,task:'connection_check',question:'',jobId:null,factRevisionIds:[],targetFactId:null,history:[]});
     setMessage('连接测试成功。未发送岗位、事实或个人联系方式。');
    })}>测试连接（不含个人资料）</button>
    <button className="text-button" disabled={!status?.hasKey} onClick={()=>{if(window.confirm('删除当前接口的系统凭据？岗位、事实和历史内容不会改变。'))void work(async()=>{setStatus(await service.deleteKey());onSaved();setMessage('当前接口的密钥已删除。');});}}>删除当前接口密钥</button>
   </div>
  </fieldset>
  {message&&<p className={error?'ai-error':'muted'} role={error?'alert':'status'}>{message}</p>}
 </section>;
}
