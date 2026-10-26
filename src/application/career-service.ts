import { invoke, isTauri } from '@tauri-apps/api/core';

export interface Asset { id: string; title: string; summary: string; organization: string; role: string }
export interface Fact { id: string; contributionId: string; revisionId: string; content: string; verification: 'UNCERTAIN' | 'USER_CONFIRMED'; risk: 'LOW' | 'HIGH'; ownership: string; state: 'ACTIVE' | 'RETRACTED'; revision: number }
export interface Job { id: string; company: string; roleTitle: string; jd: string }
export interface Analysis { id: string; jobId: string; version: number; requirements: string[] }
export interface Portfolio { id: string; jobId: string; analysisId: string; version: number; revisionIds: string[] }
export interface ResumePlan { name: string; contact: string; education: string; items: { revisionId: string; text: string; title: string; organization: string; role: string }[] }
export interface Resume { id: string; jobId: string; portfolioId: string; version: number; status: 'DRAFT' | 'CONTENT_READY'; plan: ResumePlan; createdAt: string }
export interface FinalFile { id: string; resumeId: string; name: string; hash: string; used: number; createdAt: string }
export interface Application { id: string; jobId: string; fileId: string; channel: string; status: string; note: string; appliedAt: string }
export interface CareerState { assets: Asset[]; facts: Fact[]; jobs: Job[]; analyses: Analysis[]; portfolios: Portfolio[]; resumes: Resume[]; files: FinalFile[]; applications: Application[] }
export const emptyCareerState = (): CareerState => ({ assets: [], facts: [], jobs: [], analyses: [], portfolios: [], resumes: [], files: [], applications: [] });
export type Action =
 | { type: 'add_asset'; organization: string; role: string; title: string; summary: string }
 | { type: 'add_fact'; contribution_id: string; content: string; ownership: string }
 | { type: 'review_fact'; fact_id: string; expected_revision_id: string; confirmed: boolean; risk_acknowledged: boolean }
 | { type: 'revise_fact'; fact_id: string; expected_revision_id: string; content: string; ownership: string }
 | { type: 'retract_fact'; fact_id: string; expected_revision_id: string }
 | { type: 'archive_asset'; contribution_id: string }
 | { type: 'add_job'; company: string; role_title: string; jd: string }
 | { type: 'save_analysis'; job_id: string; expected_jd: string; requirements: string[] }
 | { type: 'confirm_portfolio'; job_id: string; analysis_id: string; revision_ids: string[] }
 | { type: 'compile_resume'; portfolio_id: string; name: string; contact: string; education: string }
 | { type: 'mark_ready'; resume_id: string }
 | { type: 'record_application'; file_id: string; channel: string; note: string }
 | { type: 'update_application'; application_id: string; status: string; note: string };
export type NativeInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
export function errorMessage(error: unknown): string {
 if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
 return typeof error === 'string' ? error : '操作未完成，请重试。原有数据保留。';
}
export function createCareerService(call: NativeInvoke = invoke, native = isTauri()) {
 const requireDesktop = () => { if (!native) throw new Error('请在桌面版中使用个人工作区。浏览器可查看交互演示。'); };
 return {
  native,
  async load(): Promise<CareerState> { requireDesktop(); return call<CareerState>('workspace_snapshot'); },
  async execute(action: Action): Promise<{ id?: string; revisionId?: string }> { requireDesktop(); return call('workspace_action', { action }); },
  async attach(resumeId: string, file: File): Promise<{ id: string }> {
   requireDesktop();
   if (file.size > 15 * 1024 * 1024 || file.size < 8) throw new Error('请选择不超过 15 MB 的有效 PDF。');
   const bytes = new Uint8Array(await file.arrayBuffer());
   return call('attach_final_pdf', { resumeId, name: file.name, bytes: Array.from(bytes) });
  },
  async readFile(fileId: string): Promise<Uint8Array> { requireDesktop(); return new Uint8Array(await call<number[]>('read_final_pdf', { fileId })); },
 };
}
export type CareerService = ReturnType<typeof createCareerService>;
const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export function resumeMarkdown(resume: Resume): string {
 const p = resume.plan;
 return ['# ' + p.name, p.contact, p.education ? '## 教育背景\n' + p.education : '', '## 项目与工作经历', ...p.items.map(i => '### ' + i.organization + ' · ' + i.title + (i.role ? ' / ' + i.role : '') + '\n- ' + i.text)].filter(Boolean).join('\n\n');
}
export function resumeHtml(resume: Resume): string {
 const p = resume.plan;
 const groups = new Map<string, typeof p.items>();
 for (const i of p.items) { const title = i.organization + ' · ' + i.title + (i.role ? ' / ' + i.role : ''); groups.set(title, [...(groups.get(title) ?? []), i]); }
 return '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>' + escape(p.name) + ' · 简历</title><style>@page{size:A4;margin:18mm}body{max-width:760px;margin:32px auto;font:14px/1.8 "Microsoft YaHei",sans-serif;color:#222}h1{font-size:27px;margin-bottom:4px}h2{font-size:18px;border-bottom:1px solid #ccc;padding-bottom:5px}h3{font-size:15px;margin-bottom:6px}p{white-space:pre-wrap}li{margin-bottom:7px}section{break-inside:avoid}@media print{body{margin:0}}</style><body><h1>' + escape(p.name) + '</h1><p>' + escape(p.contact) + '</p>' + (p.education ? '<h2>教育背景</h2><p>' + escape(p.education) + '</p>' : '') + '<h2>项目与工作经历</h2>' + [...groups].map(([title, items]) => '<section><h3>' + escape(title) + '</h3><ul>' + items.map(i => '<li>' + escape(i.text) + '</li>').join('') + '</ul></section>').join('') + '</body></html>';
}
export function download(contents: BlobPart, type: string, name: string) {
 const url = URL.createObjectURL(new Blob([contents], { type }));
 const a = document.createElement('a'); a.href = url; a.download = name; a.click();
 setTimeout(() => URL.revokeObjectURL(url), 30000);
}
