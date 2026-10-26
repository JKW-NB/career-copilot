import { describe,it,expect,vi } from 'vitest';
import { createCareerService,emptyCareerState,resumeHtml,resumeMarkdown,errorMessage,type Resume } from './career-service';
const resume:Resume={id:'r',jobId:'j',portfolioId:'p',version:1,status:'CONTENT_READY',createdAt:'2026-10-26',plan:{name:'<script>unsafe</script>',contact:'test@example.invalid',education:'本科',items:[{revisionId:'f1',text:'访谈中的 <script> 作为文字保留',organization:'机构',title:'项目',role:'参与'},{revisionId:'f2',text:'整理报告',organization:'机构',title:'项目',role:'参与'}]}};
describe('career service boundary',()=>{
 it('never routes browser personal data into native commands',async()=>{
  const call=vi.fn();const service=createCareerService(call,false);
  await expect(service.load()).rejects.toThrow('桌面版');
  await expect(service.execute({type:'archive_asset',contribution_id:'x'})).rejects.toThrow('桌面版');
  expect(call).not.toHaveBeenCalled();
 });
 it('sends business intent to native and preserves structured rejection',async()=>{
  const call=vi.fn().mockResolvedValueOnce(emptyCareerState()).mockRejectedValueOnce({code:'STALE_INPUT',message:'事实已变化'});
  const service=createCareerService(call,true);await service.load();
  await expect(service.execute({type:'retract_fact',fact_id:'f',expected_revision_id:'r'})).rejects.toEqual({code:'STALE_INPUT',message:'事实已变化'});
  expect(call).toHaveBeenLastCalledWith('workspace_action',{action:{type:'retract_fact',fact_id:'f',expected_revision_id:'r'}});
 });
 it('exports inert escaped content and groups facts without inventing text',()=>{
  const html=resumeHtml(resume);expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');
  expect((html.match(/<section>/g)??[])).toHaveLength(1);expect(html).toContain('整理报告');
  expect(resumeMarkdown(resume)).toContain('整理报告');expect(resumeMarkdown(resume)).not.toContain('提升');
 });
 it('keeps actionable error messages',()=>{expect(errorMessage({code:'X',message:'请重新审查'})).toBe('请重新审查');});
});
