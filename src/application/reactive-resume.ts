import type { Resume } from './career-service';

/** JSON Resume interchange format, supported by Reactive Resume's JSON Resume importer. */
export function reactiveResumeJson(resume: Resume): string {
 if (resume.status !== 'CONTENT_READY') throw new Error('请先确认内容就绪，再导出到 Reactive Resume。');
 const groups = new Map<string, { name: string; position: string; summary: string; highlights: string[] }>();
 for (const item of resume.plan.items) {
  const key = JSON.stringify([item.organization, item.title, item.role]);
  let group = groups.get(key);
  if (!group) {
   group = { name: item.organization, position: item.role, summary: item.title, highlights: [] };
   groups.set(key, group);
  }
  group.highlights.push(item.text);
 }
 return JSON.stringify({
  basics: { name: resume.plan.name, summary: [
   resume.plan.contact ? '联系方式：\n' + resume.plan.contact : '',
   resume.plan.education ? '教育背景：\n' + resume.plan.education : '',
  ].filter(Boolean).join('\n\n') },
  work: [...groups.values()],
 }, null, 2);
}

export function reactiveResumeFilename(resume: Resume): string {
 const id = resume.id.replace(/[^a-zA-Z0-9_-]/g, '_');
 return `career-copilot-${id}-v${resume.version}.json`;
}
