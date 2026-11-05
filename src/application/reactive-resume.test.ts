import { describe, it, expect } from 'vitest';
import type { Resume } from './career-service';
import { reactiveResumeJson, reactiveResumeFilename } from './reactive-resume';
const resume: Resume = {id:'resume-1',jobId:'private-job',portfolioId:'private-portfolio',version:2,status:'CONTENT_READY',createdAt:'2026-11-05',plan:{name:'测试求职者',contact:'邮箱与电话待核实',education:'测试大学\n统计学硕士在读',items:[{revisionId:'private-revision-1',organization:'测试机构',title:'访谈项目',role:'参与',text:'整理 12 份访谈记录'},{revisionId:'private-revision-2',organization:'测试机构',title:'访谈项目',role:'参与',text:'形成问题清单'}]}};
describe('Reactive Resume interchange export',()=>{
 it('rejects drafts even when called outside the UI',()=>{expect(()=>reactiveResumeJson({...resume,status:'DRAFT'})).toThrow('确认内容就绪');});
 it('preserves frozen content and groups matching contributions without inferring dates or qualifications',()=>{
  const before=structuredClone(resume);const data=JSON.parse(reactiveResumeJson(resume));
  expect(data.work).toEqual([{name:'测试机构',position:'参与',summary:'访谈项目',highlights:['整理 12 份访谈记录','形成问题清单']}]);
  expect(data.basics.summary).toContain(resume.plan.education);expect(data.basics.summary).toContain(resume.plan.contact);
  expect(data.education).toBeUndefined();expect(data.basics.email).toBeUndefined();expect(resume).toEqual(before);
  expect(reactiveResumeJson(resume)).not.toContain('private-');
 });
 it('does not merge different roles and handles punctuation and multiline text losslessly',()=>{
  const changed=structuredClone(resume);changed.plan.items[1].role='独立完成';changed.plan.items[1].text='保留 "引号" 与 <符号>\n第二行';
  const data=JSON.parse(reactiveResumeJson(changed));expect(data.work).toHaveLength(2);expect(data.work[1].highlights[0]).toBe(changed.plan.items[1].text);
 });
 it('produces distinct safe filenames across snapshot identities',()=>{
  expect(reactiveResumeFilename(resume)).toBe('career-copilot-resume-1-v2.json');
  expect(reactiveResumeFilename({...resume,id:'other'})).not.toBe(reactiveResumeFilename(resume));
  expect(reactiveResumeFilename({...resume,id:'../bad'})).not.toContain('/');
 });
});
