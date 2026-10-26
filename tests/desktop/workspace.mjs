import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
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
let identity;
for(let cycle=1;cycle<=2;cycle++){
 const child=spawn(exe,[],{cwd:root,windowsHide:true,env:{...process.env,CAREER_COPILOT_WORKSPACE:path.join(runRoot,'workspace'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-address=127.0.0.1 --remote-debugging-port='+port},stdio:['ignore','pipe','pipe']});
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
   await page.getByRole('button',{name:'新增职业资产',exact:true}).click();
   const dialog=page.getByRole('dialog');
   await dialog.getByLabel('机构 / 团队').fill('作品集测试团队');
   await dialog.getByLabel('职位 / 角色').fill('产品实习');
   await dialog.getByLabel('项目 / 贡献名称').fill('用户调研项目');
   await dialog.getByLabel('经历描述').fill('整理真实访谈材料，形成研究问题。');
   await dialog.getByRole('button',{name:'保存职业资产'}).click();
   await expect(dialog).not.toBeVisible();
   await page.getByLabel('新增一条可核实的事实').fill('整理 12 份访谈记录，形成问题清单');
   await page.getByRole('button',{name:'保存待审查事实'}).click();
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
   await page.getByLabel('能力与证明要求').fill('核心：用户研究与问题归纳\n重要：清晰的需求分析');
   await page.getByRole('button',{name:'保存岗位要求，选择事实'}).click();
   await page.getByRole('checkbox',{name:/用户调研项目/}).check();
   await page.getByRole('button',{name:'确认组合（1 条事实）'}).click();
   await page.getByLabel('姓名',{exact:true}).fill('测试求职者');
   await page.getByLabel('联系方式').fill('test@example.invalid');
   await page.getByLabel('教育背景（可选，自行核实）').fill('测试大学');
   await page.getByRole('button',{name:'生成并保存内容版本'}).click();
   await expect(page.locator('.real-paper')).toContainText('12 份访谈记录');
   await page.getByRole('button',{name:'确认内容就绪',exact:true}).click();
   await expect(page.getByText('内容 V1 · 已就绪',{exact:true})).toBeVisible();
   const downloadPromise=page.waitForEvent('download');
   await page.getByRole('button',{name:'导出排版稿',exact:true}).click();
   await (await downloadPromise).saveAs(path.join(runRoot,'resume.html'));
   await page.getByRole('tab',{name:'最终文件',exact:true}).click();
   await page.getByLabel('上传最终 PDF',{exact:true}).setInputFiles(pdfPath);
   await expect(page.getByRole('heading',{name:/smoke-final.pdf/})).toBeVisible();
   await page.getByLabel('投递渠道').fill('官网（仅测试登记）');
   await page.getByRole('button',{name:'我已投递，登记记录'}).click();
   await expect(page.getByText('已用于投递 · 永久冻结',{exact:true})).toBeVisible();
  }else{
   await nav('职业资产').click();
   await expect(page.getByRole('heading',{name:'用户调研项目',exact:true})).toBeVisible();
   await expect(page.getByText('用户已确认',{exact:true})).toBeVisible();
   await nav('版本资料库').click();
   await expect(page.getByRole('heading',{name:'投递记录'})).toBeVisible();
   await expect(page.getByText('smoke-final.pdf',{exact:false}).first()).toBeVisible();
   await page.locator('details').first().locator('summary').click();
   await expect(page.locator('.real-paper')).toContainText('12 份访谈记录');
   await page.getByRole('combobox',{name:'投递状态',exact:true}).selectOption('VOIDED');
   await page.getByRole('button',{name:'更新记录'}).click();
   await expect(page.getByRole('combobox',{name:'投递状态',exact:true})).toHaveValue('VOIDED');
   const snapshot=await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('workspace_snapshot'));
   assert.equal(snapshot.files[0].used,1);
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
}
console.log('Artifacts and isolated test workspace: '+runRoot);
