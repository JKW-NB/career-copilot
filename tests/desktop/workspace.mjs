import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../../', import.meta.url));
const runRoot = await mkdtemp(path.join(os.tmpdir(), 'career-personal-smoke-'));
const server = createServer().listen(0, '127.0.0.1');
await once(server, 'listening');
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const exe = path.join(root, 'src-tauri/target/debug/career-copilot.exe');
const withAi = process.argv.includes('--ai');
const withRr = process.argv.includes('--rr');
const requests = [];
const aiServer = withAi ? createHttpServer(async (req,res) => {
 try {
  assert.equal(req.url, '/v1/chat/completions');
  assert.equal(req.headers.authorization, 'Bearer synthetic-desktop-test-key');
  let body=''; for await (const chunk of req) body+=chunk;
  const payload=JSON.parse(body);
  const context=JSON.parse(payload.messages[1].content);
  requests.push({payload,context});
  assert.ok(!body.includes('test@example.invalid'));
  assert.ok(!body.includes('测试大学'));
  assert.ok(!body.includes('整理真实访谈材料，形成研究问题。'));
  const analysis=payload.model==='synthetic-quality';
  const output=analysis?{requirements:['核心：用户研究，JD 要求负责用户调研','重要：需求分析，JD 明确提到需求分析','重要：结论整理，JD 要求研究结论整理']}:{answer:'仅基于所选内容给出建议。',suggestedText:context.rewriteTargetRevisionId?'汇总 12 份访谈记录，整理研究问题清单':null};
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(output)}}]}));
 } catch(error) {res.writeHead(500);res.end('Synthetic test failed');console.error(error.message);}
}) : null;
if(aiServer){aiServer.listen(0,'127.0.0.1');await once(aiServer,'listening');aiServer.unref();}
const aiUrl=aiServer?'http://127.0.0.1:'+aiServer.address().port+'/v1':'';
function makePdf() {
 const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 const stream='BT /F1 18 Tf 50 780 Td (Career Copilot smoke test) Tj ET';
 objects[3]='<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream';
 let text='%PDF-1.4\n';const offsets=[0];
 objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(text));text+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});
 const start=Buffer.byteLength(text);text+='xref\n0 6\n0000000000 65535 f \n';
 for(const offset of offsets.slice(1))text+=String(offset).padStart(10,'0')+' 00000 n \n';
 return Buffer.from(text+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF');
}
const pdfPath = path.join(runRoot,'smoke-final.pdf');
await writeFile(pdfPath, makePdf());
let imports = 0;
let connectionChecks = 0;
let exports = 0;
let importedSnapshot;
let editorVisits = 0;
const rrServer = withRr ? createHttpServer(async (req, res) => {
 try {
  if (req.url === '/favicon.ico') { res.statusCode = 204; return res.end(); }
  if (req.url === '/builder/test-resume') {
   editorVisits++;
   return res.end('Synthetic Reactive Resume editor');
  }
  if (req.url === '/api/openapi/resumes?limit=1') {
   assert.equal(req.method, 'GET');
   connectionChecks++;
   if (req.headers['x-api-key'] !== 'synthetic-rr-key') {
    res.statusCode = 401;
    return res.end();
   }
   res.setHeader('Content-Type', 'application/json');
   return res.end('[]');
  }
  assert.equal(req.headers['x-api-key'], 'synthetic-rr-key');
  if (req.url === '/api/openapi/resumes/file-imports') {
   assert.equal(req.method, 'POST');
   const chunks = [];
   for await (const chunk of req) chunks.push(chunk);
   const body = Buffer.concat(chunks).toString('utf8');
   assert.match(body, /name="format"\r\n\r\nJSON_RESUME/);
   assert.match(body, /整理 12 份访谈记录，形成问题清单/);
   assert.doesNotMatch(body, /revisionId|岗位描述 JD/);
   importedSnapshot = JSON.parse(body.match(/\r\n\r\n(\{[^\r\n]*\})\r\n--/)?.[1] ?? '');
   imports++;
   res.setHeader('Content-Type', 'application/json');
   return res.end(JSON.stringify('test-resume'));
  }
  assert.equal(req.url, '/api/openapi/resumes/test-resume/exports/pdf');
  assert.equal(req.method, 'GET');
  exports++;
  res.setHeader('Content-Type', 'application/pdf');
  res.end(exports === 1 ? 'invalid PDF' : makePdf());
 } catch (error) {
  res.statusCode = 500;
  res.end('Synthetic request assertion failed');
  console.error(error.message);
 }
}) : null;
if (rrServer) {
 rrServer.listen(0, '127.0.0.1');
 await once(rrServer, 'listening');
 rrServer.unref();
}
const rrOrigin = rrServer ? 'http://127.0.0.1:' + rrServer.address().port : '';
const finalFilename = withRr ? 'reactive-resume.pdf' : 'smoke-final.pdf';
let identity;
let restartInbox;
for(let cycle=1;cycle<=2;cycle++){
 const child=spawn(exe,[],{cwd:root,windowsHide:true,env:{...process.env,CAREER_COPILOT_WORKSPACE:path.join(runRoot,'workspace'),WEBVIEW2_USER_DATA_FOLDER:path.join(runRoot,'webview'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-address=127.0.0.1 --remote-debugging-port='+port},stdio:['ignore','pipe','pipe']});
 let output=''; child.stdout.on('data',s=>output+=s);child.stderr.on('data',s=>output+=s);
 let browser;
 try {
  let endpoint;
  const deadline=Date.now()+60000;
  while(Date.now()<deadline){
   if(child.exitCode!==null)throw new Error('App exited: '+output);
   try {endpoint=(await (await fetch('http://127.0.0.1:'+port+'/json/version',{signal:AbortSignal.timeout(1000)})).json()).webSocketDebuggerUrl;if(endpoint)break;}catch{}
   await sleep(250);
  }
  assert.ok(endpoint,'WebView endpoint unavailable');
  browser=await chromium.connectOverCDP(endpoint);
  let page;
  try {
   await expect.poll(()=>{page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost'));return !!page;},{timeout:30000}).toBe(true);
  } catch {
   throw new Error('Bundled page did not open. Observed URLs: '+JSON.stringify(browser.contexts().flatMap(c=>c.pages()).map(p=>p.url()))+'; app output: '+output);
  }
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.getByRole('heading',{name:'为下一次机会做好准备'})).toBeVisible();
  const storage=await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('get_storage_info'));
  if(identity)assert.equal(storage.workspaceId,identity);identity=storage.workspaceId;
  assert.equal(storage.root,path.join(runRoot,'workspace'));
  const nav=name=>page.getByRole('navigation',{name:'个人工作区导航'}).getByRole('button',{name,exact:true});
  if(cycle===1){
   if (withRr) {
    await page.getByRole('button', { name: '设置与数据', exact: true }).click();
    await page.getByLabel('Reactive Resume 站点').fill(rrOrigin);
    await page.getByLabel('Reactive Resume API Key').fill('synthetic-invalid-key');
    await page.getByRole('button', { name: '保存 Reactive Resume 设置' }).click();
    await expect(page.getByText('Reactive Resume 设置已保存。')).toBeVisible();
    const testConnection = page.getByRole('button', { name: '测试已保存的连接' });
    await testConnection.click();
    await expect(page.getByText(/Reactive Resume 拒绝访问/)).toBeVisible();
    await page.getByLabel('Reactive Resume API Key').fill('synthetic-rr-key');
    await page.getByRole('button', { name: '保存 Reactive Resume 设置' }).click();
    await expect(page.getByText('Reactive Resume 设置已保存。')).toBeVisible();
    await testConnection.click();
    await expect(page.getByText('连接正常，密钥可读取账号资料。创建副本仍需写权限。')).toBeVisible();
    assert.equal(connectionChecks, 2);
    assert.equal(imports, 0);
    await nav('今日概览').click();
   }
   await page.getByRole('button',{name:'新增职业资产',exact:true}).click();
   const dialog=page.getByRole('dialog');
   await dialog.getByLabel('机构 / 团队').fill('作品集测试团队');
   await dialog.getByLabel('职位 / 角色').fill('产品实习');
   await dialog.getByLabel('项目 / 贡献名称').fill('用户调研项目');
   await dialog.getByLabel('经历描述').fill('整理真实访谈材料，形成研究问题。');
   await dialog.getByRole('button',{name:'保存职业资产'}).click();
   await expect(dialog).not.toBeVisible();
   await page.getByLabel('上传佐证材料').setInputFiles({name:'访谈原始记录.txt',mimeType:'text/plain',buffer:Buffer.from('合成访谈记录，用于验证文件归档。')});
   await expect(page.getByRole('button',{name:'访谈原始记录.txt',exact:true})).toBeVisible();
   const assetId = await page.evaluate(async () => (await window.__TAURI_INTERNALS__.invoke('workspace_snapshot')).assets[0].id);
   const dropFolder = path.join(storage.root,'evidence','inbox',assetId,'项目资料');
   restartInbox = dropFolder;
   await mkdir(dropFolder,{recursive:true});
   await writeFile(path.join(dropFolder,'补充工作记录.txt'),'通过资源管理器导入的合成记录');
   await page.getByRole('button',{name:'刷新材料',exact:true}).click();
   await expect(page.getByRole('button',{name:'补充工作记录.txt',exact:true})).toBeVisible();
   await page.getByLabel('新增一条可核实的事实').fill('整理 12 份访谈记录，形成问题清单');
   await page.getByRole('button',{name:'保存待审查事实'}).click();
   await page.getByText('事实与证据 · 0 份关联',{exact:true}).click();
   await page.getByText('证据关系画布',{exact:true}).click();
   await expect(page.locator('.evidence-lanes > section')).toHaveCount(3);
   await expect(page.locator('.evidence-edges g path')).toHaveCount(0);
   await page.getByLabel('事实别名',{exact:true}).fill('访谈整理');
   await page.locator('.real-evidence-map').getByRole('button',{name:'保存别名',exact:true}).click();
   await expect(page.getByText('访谈整理',{exact:true})).toBeVisible();
   await page.getByLabel('关联材料',{exact:true}).selectOption({label:'访谈原始记录.txt'});
   await page.getByLabel('证据位置（可选）').fill('第 2 段');
   await page.getByRole('button',{name:'保存证据关联'}).click();
   await page.getByRole('button',{name:'标记已核对'}).click();
   await expect(page.getByText('第 2 段 · 已核对',{exact:true})).toBeVisible();
   await page.getByRole('button',{name:/^核对与修正/}).click();
   await expect(page.getByText('事实与证据 · 1 份关联',{exact:true})).toBeFocused();
   await page.getByText('修正证据位置',{exact:true}).click();
   await page.getByLabel('修正位置',{exact:true}).fill('第 3 段');
   await page.getByRole('button',{name:'保存修正',exact:true}).click();
   await expect(page.getByText('第 3 段 · 待核对',{exact:true})).toBeVisible();
   await page.getByText('修正证据位置',{exact:true}).click();
   await page.getByLabel('修正位置',{exact:true}).fill('第 2 段');
   await page.getByRole('button',{name:'保存修正',exact:true}).click();
   await page.getByRole('button',{name:'标记已核对',exact:true}).click();
   await expect(page.getByText('第 2 段 · 已核对',{exact:true})).toBeVisible();
   await page.getByRole('button',{name:'审查事实',exact:true}).click();
   await dialog.getByRole('checkbox',{name:'我确认这是自己真实经历的准确表达。'}).check();
   await dialog.getByRole('checkbox',{name:/我已单独核实/}).check();
   await dialog.getByRole('button',{name:'确认此事实'}).click();
   await expect(dialog).not.toBeVisible();
   await nav('求职工作区').click();
   await page.getByRole('button',{name:'新增岗位',exact:true}).click();
   await dialog.getByLabel('公司',{exact:true}).fill('目标测试公司');
   await dialog.getByLabel('岗位名称').fill('产品经理实习');
   await dialog.getByLabel('岗位描述 JD').fill('负责用户调研、需求分析和研究结论整理。');
   await dialog.getByRole('button',{name:'保存目标岗位'}).click();
   await expect(dialog).not.toBeVisible();
   if(withAi){
    await page.getByRole('button',{name:'设置与数据',exact:true}).click();
    await page.getByLabel('接口基础地址').fill(aiUrl);
    await page.getByLabel('默认模型',{exact:true}).fill('synthetic-default');
    await page.getByLabel('高质量模型',{exact:true}).fill('synthetic-quality');
    await page.getByLabel('API Key',{exact:true}).fill('synthetic-desktop-test-key');
    await page.getByRole('button',{name:'保存模型设置'}).click();
    await expect(page.getByText('当前接口密钥已保存',{exact:true})).toBeVisible();
    assert.equal(requests.length,0,'saving settings must not call the provider');
    await expect(page.getByLabel('API Key',{exact:true})).toHaveValue('');
    await page.getByRole('button',{name:'测试连接（不含个人资料）'}).click();
    await expect(page.getByText('连接测试成功。未发送岗位、事实或个人联系方式。',{exact:true})).toBeVisible();
    assert.equal(requests.length,1);
    assert.deepEqual(Object.keys(requests[0].context),['question']);
    await nav('求职工作区').click();
    await page.getByRole('button',{name:'AI 分析当前岗位',exact:true}).click();
    const panel=page.getByRole('complementary',{name:'个人 AI 助手面板'});
    await expect(panel).toBeVisible();
    assert.equal(requests.length,1,'opening panel must not call the provider');
    await panel.getByRole('button',{name:'发送',exact:true}).click();
    await expect(panel.getByRole('button',{name:'应用修改',exact:true})).toBeVisible();
    assert.equal((await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('workspace_snapshot'))).analyses.length,0);
    assert.equal(requests[1].context.job.description,'负责用户调研、需求分析和研究结论整理。');
    assert.deepEqual(requests[1].context.facts,[]);
    await page.getByLabel('能力与证明要求').fill('未保存的用户编辑');
    await panel.getByRole('button',{name:'应用修改',exact:true}).click();
    await expect(panel.getByRole('alert')).toContainText('未保存');
    assert.equal((await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('workspace_snapshot'))).analyses.length,0);
    await page.getByRole('button',{name:'恢复已保存的要求',exact:true}).click();
    await panel.getByRole('button',{name:'应用修改',exact:true}).click();
    await expect(panel.getByText('已应用',{exact:true})).toBeVisible();
    await expect(page.getByLabel('能力与证明要求')).toHaveValue(/核心：用户研究/);
    assert.equal((await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('workspace_snapshot'))).analyses.length,1);
    await panel.getByRole('button',{name:'收起个人 AI 助手'}).click();
    await expect(page.getByRole('switch',{name:'个人 AI 助手',exact:true})).not.toBeChecked();
   }
   await page.getByLabel('能力与证明要求').fill('核心：用户研究与问题归纳\n重要：清晰的需求分析');
   await page.getByRole('button',{name:'保存岗位要求，选择事实'}).click();
   await page.getByRole('checkbox',{name:/用户调研项目/}).check();
   await page.getByRole('button',{name:'确认组合（1 条事实）'}).click();
   await page.getByLabel('姓名',{exact:true}).fill('测试求职者');
   await page.getByLabel('联系方式').fill('test@example.invalid');
   await page.getByLabel('教育背景（可选，自行核实）').fill('测试大学');
   await page.getByRole('button',{name:'生成并保存内容版本'}).click();
   await expect(page.locator('.real-paper')).toContainText('12 份访谈记录');
   await expect(page.getByRole('button',{name:'导出到 Reactive Resume',exact:true})).toBeDisabled();
   await page.getByRole('button',{name:'确认内容就绪',exact:true}).click();
   await expect(page.getByText('内容 V1 · 已就绪',{exact:true})).toBeVisible();
   const readySnapshot = await page.evaluate(async () => (await window.__TAURI_INTERNALS__.invoke('workspace_snapshot')).resumes[0]);
   assert.equal(readySnapshot.plan.items[0].evidence[0].locator,'第 2 段');
   assert.equal(readySnapshot.plan.items[0].evidence[0].checked,1);
   const jsonDownload=page.waitForEvent('download');
   await page.getByRole('button',{name:'导出到 Reactive Resume',exact:true}).click();
   const jsonFile=path.join(runRoot,'reactive-resume.json');
   await (await jsonDownload).saveAs(jsonFile);
   const exported=JSON.parse(await readFile(jsonFile,'utf8'));
   assert.equal(exported.basics.name,'测试求职者');
   assert.equal(exported.work[0].highlights[0],'整理 12 份访谈记录，形成问题清单');
   assert.ok(exported.basics.summary.includes('测试大学'));
   assert.ok(!JSON.stringify(exported).includes('revisionId'));
   const downloadPromise=page.waitForEvent('download');
   await page.getByRole('button',{name:'导出排版稿',exact:true}).click();
   await (await downloadPromise).saveAs(path.join(runRoot,'resume.html'));
   if (withRr) {
    const openEditor = page.getByRole('button', { name: '在 Reactive Resume 中排版', exact: true });
    const archive = page.getByRole('button', { name: '取回 PDF 并归档', exact: true });
    page.once('dialog', dialog => dialog.dismiss());
    await openEditor.click();
    assert.equal(imports, 0);
    for (let attempt = 0; attempt < 2; attempt++) {
     page.once('dialog', dialog => dialog.accept());
     await openEditor.click();
     await expect(page.getByText('已请求打开排版副本。排版完成后，可回到这里取回 PDF。')).toBeVisible();
    }
    assert.equal(imports, 1);
    await expect.poll(() => editorVisits).toBeGreaterThan(0);
    assert.deepEqual(importedSnapshot, exported);
    page.once('dialog', dialog => dialog.accept());
    await archive.click();
    await expect(page.getByText(/请选择完整的 PDF 文件/)).toBeVisible();
    assert.equal((await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('workspace_snapshot'))).files.length, 0);
    page.once('dialog', dialog => dialog.accept());
    await archive.click();
    await expect(page.getByText('PDF 已归档到此内容版本。')).toBeVisible();
    assert.equal(exports, 2);
   }
   await page.getByRole('tab',{name:'最终文件',exact:true}).click();
   if (!withRr) await page.getByLabel('上传最终 PDF',{exact:true}).setInputFiles(pdfPath);
   await expect(page.getByRole('heading',{name:finalFilename,exact:true})).toBeVisible();
   await page.getByLabel('投递渠道').fill('官网（仅测试登记）');
   await page.getByRole('button',{name:'我已投递，登记记录'}).click();
   await expect(page.getByText('已用于投递 · 永久冻结',{exact:true})).toBeVisible();
   if(withAi){
    await page.getByRole('switch',{name:'个人 AI 助手',exact:true}).click();
    const panel=page.getByRole('complementary',{name:'个人 AI 助手面板'});
    await panel.getByRole('combobox',{name:'AI 本轮任务'}).selectOption('assistant');
    await expect(panel.getByRole('checkbox',{name:'发送所选岗位 JD',exact:true})).not.toBeChecked();
    const target=await panel.getByRole('combobox',{name:'AI 事实修改目标'}).locator('option').nth(1).getAttribute('value');
    await panel.getByRole('combobox',{name:'AI 事实修改目标'}).selectOption(target);
    for(const apply of [false,true]){
     await panel.getByLabel('发送给个人 AI 助手的问题').fill('请改写所选事实的措辞');
     await panel.getByRole('button',{name:'发送',exact:true}).click();
     await expect(panel.getByRole('button',{name:'应用修改',exact:true})).toBeVisible();
     const before=await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('workspace_snapshot'));
     assert.equal(before.facts[0].verification,'USER_CONFIRMED');
     assert.equal(before.facts[0].content,'整理 12 份访谈记录，形成问题清单');
     await panel.getByRole('button',{name:apply?'应用修改':'暂不应用',exact:true}).click();
     await expect(panel.getByText(apply?'已应用 · 待审查':'暂不应用 · 已保留原内容',{exact:true})).toBeVisible();
    }
    const after=await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('workspace_snapshot'));
    assert.equal(after.facts[0].verification,'UNCERTAIN');
    assert.equal(after.facts[0].content,'汇总 12 份访谈记录，整理研究问题清单');
    assert.equal(after.resumes[0].plan.items[0].text,'整理 12 份访谈记录，形成问题清单');
    await panel.getByRole('button',{name:'收起个人 AI 助手'}).click();
    await expect(panel).toBeHidden();
    await page.getByRole('switch',{name:'个人 AI 助手',exact:true}).click();
    await expect(panel.getByText('已应用 · 待审查',{exact:true})).toBeVisible();
    await page.screenshot({path:path.join(runRoot,'ai-panel.png'),fullPage:true});
    await panel.getByRole('button',{name:'收起个人 AI 助手'}).click();
    await page.getByRole('button',{name:'设置与数据',exact:true}).click();
    page.once('dialog',d=>d.accept());
    await page.getByRole('button',{name:'删除当前接口密钥',exact:true}).click();
    await expect(page.getByText('当前接口未保存密钥',{exact:true})).toBeVisible();
    assert.equal(requests.length,4);
    for(const r of requests.slice(2)){
     assert.ok(!r.context.job,'unselected JD must not be sent');
     assert.equal(r.context.facts.length,1);
     assert.deepEqual(r.context.history,[]);
    }
   }
  }else{
   await nav('职业资产').click();
   await expect(page.getByRole('heading',{name:'用户调研项目',exact:true})).toBeVisible();
   await expect(page.getByRole('button',{name:'关机期间新增.txt',exact:true})).toHaveCount(1);
   const evidenceDownload = page.waitForEvent('download');
   await page.getByRole('button',{name:'访谈原始记录.txt',exact:true}).click();
   const evidencePath = path.join(runRoot,'evidence-export.txt');
   await (await evidenceDownload).saveAs(evidencePath);
   assert.equal(await readFile(evidencePath,'utf8'),'合成访谈记录，用于验证文件归档。');
   await expect(page.locator('#real-main').getByText(withAi?'待审查':'用户已确认',{exact:true})).toBeVisible();
   await nav('版本资料库').click();
   await expect(page.getByRole('heading',{name:'投递记录'})).toBeVisible();
   await expect(page.getByText(finalFilename,{exact:false}).first()).toBeVisible();
   await page.locator('details').first().locator('summary').click();
   await expect(page.locator('.real-paper')).toContainText('12 份访谈记录');
   const historyEvidence = page.getByRole('heading',{name:'事实与证据快照'}).locator('..');
   await expect(historyEvidence.getByRole('button',{name:'访谈原始记录.txt'})).toBeVisible();
   await expect(historyEvidence).toContainText('第 2 段 · 已核对');
   await page.getByRole('combobox',{name:'投递状态',exact:true}).selectOption('VOIDED');
   await page.getByRole('button',{name:'更新记录'}).click();
   await expect(page.getByRole('combobox',{name:'投递状态',exact:true})).toHaveValue('VOIDED');
   const snapshot=await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('workspace_snapshot'));
   assert.equal(snapshot.files[0].used,1);
   if (withRr) {
    assert.equal(snapshot.files[0].resumeId, snapshot.resumes[0].id);
    await page.getByRole('button', { name: '设置与数据', exact: true }).click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '删除 Reactive Resume 密钥' }).click();
    await expect(page.getByText('Reactive Resume 密钥已移除。')).toBeVisible();
   }
   assert.equal(snapshot.applications[0].status,'VOIDED');
   assert.equal(snapshot.resumes.length,1);
  }
  await page.screenshot({path:path.join(runRoot,'workspace-'+cycle+'.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS personal workspace desktop cycle '+cycle+': '+(cycle===1?'asset → review → job → portfolio → resume export → real PDF → application':'restart persistence → historical resume → application update → permanent lock'));
 }finally{
  if(browser)await browser.close();
  if(child.exitCode===null){
   await exec('powershell.exe',['-NoProfile','-Command','(Get-Process -Id '+child.pid+').CloseMainWindow()'],{windowsHide:true}).catch(()=>{});
   const end=Date.now()+10000;while(child.exitCode===null&&Date.now()<end)await sleep(100);
   if(child.exitCode===null){await exec('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true});throw new Error('App did not close gracefully');}
  }
  await sleep(300);
 }
 if(cycle===1)await writeFile(path.join(restartInbox,'关机期间新增.txt'),'重启时自动导入的合成材料');
}
if(aiServer)await new Promise(resolve=>aiServer.close(resolve));
if (rrServer) await new Promise(resolve => {
 rrServer.close(resolve);
 rrServer.closeAllConnections();
});
console.log('Artifacts and isolated test workspace: '+runRoot);
