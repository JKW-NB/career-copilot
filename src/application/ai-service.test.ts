import { describe,it,expect,vi } from 'vitest';
import { createAiService, type AiRequest } from './ai-service';
const request:AiRequest={expectedBaseUrl:'https://example.invalid/v1',task:'assistant',question:'问题',jobId:null,factRevisionIds:['selected-revision'],targetFactId:'selected-fact',history:[]};
describe('AI service command boundary',()=>{
 it('never sends browser preview data to native AI',async()=>{
  const call=vi.fn();const service=createAiService(call,false);
  await expect(service.generate(request)).rejects.toThrow('桌面版');await expect(service.configure({baseUrl:'x',defaultModel:'x',highQualityModel:'x'},'synthetic-key')).rejects.toThrow('桌面版');
  expect(call).not.toHaveBeenCalled();
 });
 it('sends only selected IDs and question, not a workspace snapshot',async()=>{
  const call=vi.fn().mockResolvedValue({id:'run',output:{answer:'回答'},canApply:false,target:{}});
  await createAiService(call,true).generate(request);
  expect(call).toHaveBeenCalledWith('generate_ai',{request});expect(JSON.stringify(call.mock.calls)).not.toContain('education');
 });
 it('applies and dismisses only by stored run identity',async()=>{
  const call=vi.fn().mockResolvedValue({});const service=createAiService(call,true);
  await service.apply('run-id');await service.dismiss('run-id');
  expect(call).toHaveBeenNthCalledWith(1,'apply_ai_proposal',{runId:'run-id'});expect(call).toHaveBeenNthCalledWith(2,'dismiss_ai_proposal',{runId:'run-id'});
 });
 it('configuration never performs an automatic generate call',async()=>{
  const call=vi.fn().mockResolvedValue({hasKey:true});const service=createAiService(call,true);
  await service.configure({baseUrl:'https://example.invalid/v1',defaultModel:'a',highQualityModel:'b'},'synthetic-key');
  expect(call).toHaveBeenCalledTimes(1);expect(call.mock.calls[0][0]).toBe('configure_ai');
 });
});
