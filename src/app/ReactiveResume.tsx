import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { errorMessage, type Resume } from '../application/career-service';

interface Connection { origin: string | null; hasKey: boolean }

export function ReactiveResumeSettings({ native }: { native: boolean }) {
 const [connection, setConnection] = useState<Connection>();
 const [notice, setNotice] = useState('');
 const [busy, setBusy] = useState(false);
 useEffect(() => {
  if (native) void invoke<Connection>('rr_status').then(setConnection, error => setNotice(errorMessage(error)));
 }, [native]);
 return <section className="real-card">
  <h2>Reactive Resume</h2>
  <p>填写站点和该账号的读写 API Key。密钥保存在 Windows 凭据管理器，浏览器排版时请登录同一账号。</p>
  {connection && <form className="form-stack" onSubmit={async event => {
   event.preventDefault();
   const form = event.currentTarget;
   const data = new FormData(form);
   setBusy(true);
   try {
    await invoke('rr_configure', { site: data.get('site'), apiKey: data.get('apiKey') });
    (form.elements.namedItem('apiKey') as HTMLInputElement).value = '';
    setConnection(await invoke<Connection>('rr_status'));
    setNotice('Reactive Resume 设置已保存。');
   } catch (error) { setNotice(errorMessage(error)); }
   finally { setBusy(false); }
  }}>
   <label>Reactive Resume 站点<input name="site" type="url" required defaultValue={connection.origin ?? 'https://rxresu.me'} /></label>
   <label>Reactive Resume API Key<input name="apiKey" type="password" autoComplete="new-password" maxLength={512} placeholder={connection.hasKey ? '已保存，留空保留该站点密钥' : '输入该站点的 API Key'} /></label>
   <button className="button button-primary" disabled={busy}>保存 Reactive Resume 设置</button>
   {connection.hasKey && <button className="button button-secondary" type="button" disabled={busy} onClick={async () => {
    setBusy(true);
    setNotice('');
    try {
     await invoke('rr_test_connection', { expectedOrigin: connection.origin });
     setNotice('连接正常，密钥可读取账号资料。创建副本仍需写权限。');
    } catch (error) { setNotice(errorMessage(error)); }
    finally { setBusy(false); }
   }}>测试已保存的连接</button>}
   {connection.hasKey && <button className="text-button" type="button" disabled={busy} onClick={async () => {
    if (!window.confirm('删除此站点保存在本机的 API Key？')) return;
    setBusy(true);
    try {
     await invoke('rr_remove_key', { expectedOrigin: connection.origin });
     setConnection(await invoke<Connection>('rr_status'));
     setNotice('Reactive Resume 密钥已移除。');
    } catch (error) { setNotice(errorMessage(error)); }
    finally { setBusy(false); }
   }}>删除 Reactive Resume 密钥</button>}
  </form>}
  {notice && <p role="status">{notice}</p>}
 </section>;
}

export function ReactiveResumeActions({ resume, onArchived }: { resume: Resume; onArchived: () => Promise<void> }) {
 const [connection, setConnection] = useState<Connection>();
 const [notice, setNotice] = useState('');
 const [busy, setBusy] = useState(false);
 useEffect(() => {
  void invoke<Connection>('rr_status').then(setConnection, error => setNotice(errorMessage(error)));
 }, []);
 const run = async (archive: boolean) => {
  if (!connection?.origin || busy) return;
  const message = archive
   ? `请在排版页面复核 PDF 和文字。确认它对应内容 V${resume.version}，并归档当前 PDF？若改过事实，请先修订职业资产并生成新版本。`
   : `将在 ${connection.origin} 打开排版副本。首次创建会发送内容 V${resume.version} 的姓名、联系方式、教育背景和已确认经历。继续？`;
  if (!window.confirm(message)) return;
  setBusy(true);
  setNotice('');
  try {
   await invoke(archive ? 'rr_archive' : 'rr_open', { resumeId: resume.id, expectedOrigin: connection.origin });
   if (archive) {
    setNotice('PDF 已归档到此内容版本。');
    await onArchived().catch(() => setNotice('PDF 已归档，请重新打开页面刷新文件列表。'));
   } else {
    setNotice('已请求打开排版副本。排版完成后，可回到这里取回 PDF。');
   }
  } catch (error) { setNotice(errorMessage(error)); }
  finally { setBusy(false); }
 };
 return <div>
  {connection && !connection.hasKey && <p>请先在“设置与数据”连接 Reactive Resume。</p>}
  <div className="real-actions">
   <button className="button button-primary" disabled={!connection?.hasKey || busy} onClick={() => void run(false)}>在 Reactive Resume 中排版</button>
   <button className="button button-secondary" disabled={!connection?.hasKey || busy} onClick={() => void run(true)}>取回 PDF 并归档</button>
  </div>
  {notice && <p role="status">{notice}</p>}
 </div>;
}
