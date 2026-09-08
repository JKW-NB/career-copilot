import { useState } from 'react';
import { contributions, facts } from '../demo/fixtures';
import { type WorkspaceAction } from '../application/demo-service';
import { Badge, type PageProps } from './shared';

interface Message { question: string; answer: string; contexts: string[]; proposalId?: string; preview?: string }
export function Assistant({ state, service, run, contexts, setContexts }: PageProps & { contexts: string[]; setContexts: (values: string[]) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [operation, setOperation] = useState('question');
  const [target, setTarget] = useState('');
  const [title, setTitle] = useState('');
  const [picker, setPicker] = useState(false);
  const options = operation === 'remove' ? state.portfolio.map(item => ({ id: item.contributionId, title: contributions.find(value => value.id === item.contributionId)!.title })) : state.assetDrafts;
  const send = () => {
    if (!question.trim()) return;
    let action: WorkspaceAction | undefined;
    let preview = '';
    if (operation === 'add') {
      action = { kind: 'add', title, organization: '', summary: question.trim() };
      preview = `新增资产草稿「${title}」\n描述：${question.trim()}`;
      if (!title.trim()) { run(() => { throw new Error('请填写新增资产名称。'); }); return; }
    } else if (operation === 'remove') {
      const item = state.portfolio.find(value => value.contributionId === target);
      if (!item) { run(() => { throw new Error('请选择要移出组合的贡献。'); }); return; }
      action = { kind: 'remove', id: target, before: JSON.stringify(item) };
      preview = `从当前工作组合移出「${options.find(value => value.id === target)!.title}」。职业资产和历史版本保留。`;
    } else if (operation === 'edit' || operation === 'delete') {
      const draft = state.assetDrafts.find(item => item.id === target);
      if (!draft) { run(() => { throw new Error('请选择一项资产草稿。'); }); return; }
      action = { kind: operation, id: target, before: JSON.stringify(draft), summary: question.trim() };
      preview = operation === 'edit' ? `修改「${draft.title}」\n修改前：${draft.summary}\n修改后：${question.trim()}` : `删除资产草稿「${draft.title}」\n当前描述：${draft.summary}`;
    }
    let answer = '这是离线交互演示，暂时不能生成开放问题的真实 AI 回答。你可以选择上下文，并体验下方的新增、修改或删除建议流程。';
    if (/缺口|补充|能力|证明/.test(question)) answer = '示例建议：先核对岗位要求，再检查现有经历是否有对应的个人行动与结果。没有直接证据时，可以补充真实材料或保留缺口；不要推测数字和个人责任。';
    if (contexts.length) answer += ` 本轮已附带 ${contexts.length} 项上下文，见本条消息。`;
    let proposalId: string | undefined;
    if (action) { proposalId = service.propose(action); answer = '已按你选择的操作整理以下改动草案。请核对目标和内容，再决定是否应用。新增与修改的描述仍是待审查草稿，不会直接进入简历。'; }
    setMessages(previous => [...previous, { question: question.trim(), answer, contexts: [...contexts], proposalId, preview }]);
    setQuestion('');
  };
  return <section className="assistant-page">
    <div className="section-heading"><div><h1>AI 助手</h1><p>提问、引用工作区内容，并审核修改建议。</p></div><Badge tone="orange">离线演示 · 未连接模型</Badge></div>
    <div className="assistant-messages" aria-live="polite">{!messages.length && <p className="muted">可以询问岗位能力、经历选材或描述方式。选中页面文字后点击“加入 AI 上下文”，也可以在这里选择资产和事实。</p>}{messages.map((message, index) => {
      const proposal = state.proposals.find(item => item.id === message.proposalId);
      return <article className="chat-turn" key={index}><h3>你</h3><p>{message.question}</p>{message.contexts.length > 0 && <details><summary>本轮上下文（{message.contexts.length}）</summary>{message.contexts.map((context, i) => <blockquote key={i}>{context}</blockquote>)}</details>}<h3>助手 · 演示回复</h3><p>{message.answer}</p>{proposal && <div className="proposal"><pre>{message.preview}</pre>{proposal.status === 'pending' ? <div className="modal-actions"><button className="button button-secondary" onClick={() => service.dismissProposal(proposal.id)}>不应用</button><button className="button button-primary" onClick={() => run(() => service.applyProposal(proposal.id), '已应用到当前工作区。')}>应用到当前工作区</button></div> : <Badge>{proposal.status === 'applied' ? '已应用' : '已放弃'}</Badge>}</div>}</article>;
    })}</div>
    <div className="context-chips" aria-label="已选 AI 上下文">{contexts.map((context, index) => <div key={index}><span>{context}</span><button aria-label={`移除上下文${index + 1}`} onClick={() => setContexts(contexts.filter((_, i) => i !== index))}>×</button></div>)}</div>
    <button className="text-button" onClick={() => setPicker(!picker)}>{picker ? '收起内容选择' : '选择工作区内容作为上下文'}</button>
    {picker && <div className="context-picker">{[...contributions.map(item => `${item.title}：${item.summary}`), ...facts.map(item => `${item.text}（${item.verification}）`), ...state.assetDrafts.map(item => `草稿 ${item.title}：${item.summary}`)].map(value => <label key={value}><input type="checkbox" checked={contexts.includes(value)} onChange={event => setContexts(event.target.checked ? [...contexts, value] : contexts.filter(item => item !== value))} />{value}</label>)}</div>}
    <form className="form-stack chat-composer" onSubmit={event => { event.preventDefault(); send(); }}>
      <label>本次操作<select value={operation} onChange={event => { setOperation(event.target.value); setTarget(''); }}><option value="question">仅提问</option><option value="add">建议新增资产</option><option value="edit">建议修改草稿描述</option><option value="delete">建议删除资产草稿</option><option value="remove">建议移出当前组合</option></select></label>
      {operation === 'add' && <label>新增资产名称<input value={title} onChange={event => setTitle(event.target.value)} required maxLength={80} /></label>}
      {['edit', 'delete', 'remove'].includes(operation) && <label>操作对象<select required value={target} onChange={event => setTarget(event.target.value)}><option value="">请选择</option>{options.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>}
      <label>{operation === 'add' || operation === 'edit' ? '期望的描述' : '问题或操作说明'}<textarea aria-label="发送给 AI 助手的内容" required rows={3} value={question} onChange={event => setQuestion(event.target.value)} placeholder="输入问题，或写下希望应用的改动…" /></label>
      <button className="button button-primary">发送{operation !== 'question' && '并生成建议'}</button>
    </form>
  </section>;
}
