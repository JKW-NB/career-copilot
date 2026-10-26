import { invoke, isTauri } from '@tauri-apps/api/core';
import type { NativeInvoke } from './career-service';

export interface ProviderConfig { baseUrl: string; defaultModel: string; highQualityModel: string }
export interface ProviderStatus { config: ProviderConfig | null; hasKey: boolean; credentialStore: string }
export interface HistoryMessage { role: 'user' | 'assistant'; content: string }
export interface AiRequest {
 expectedBaseUrl: string;
 task: 'assistant' | 'job_analysis' | 'connection_check';
 question: string;
 jobId: string | null;
 factRevisionIds: string[];
 targetFactId: string | null;
 history: HistoryMessage[];
}
export interface ProposalTarget { type?: 'job' | 'fact'; jobId?: string; factId?: string; revisionId?: string; ownership?: string }
export interface AiResponse { id: string; output: { answer?: string; suggestedText?: string | null; requirements?: string[] }; canApply: boolean; target: ProposalTarget }
export function createAiService(call: NativeInvoke = invoke, native = isTauri()) {
 const desktop = () => { if (!native) throw new Error('请在桌面版配置和使用真实 AI；浏览器演示不会发送个人数据。'); };
 return {
  native,
  async status(): Promise<ProviderStatus> { desktop(); return call('ai_status'); },
  async configure(config: ProviderConfig, apiKey?: string): Promise<ProviderStatus> { desktop(); return call('configure_ai', { config, apiKey: apiKey || null }); },
  async deleteKey(): Promise<ProviderStatus> { desktop(); return call('delete_ai_key'); },
  async generate(request: AiRequest): Promise<AiResponse> { desktop(); return call('generate_ai', { request }); },
  async apply(runId: string): Promise<{ id?: string; revisionId?: string }> { desktop(); return call('apply_ai_proposal', { runId }); },
  async dismiss(runId: string): Promise<void> { desktop(); return call('dismiss_ai_proposal', { runId }); },
 };
}
export type AiService = ReturnType<typeof createAiService>;
