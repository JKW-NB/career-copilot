import { useEffect, useRef, useState } from 'react';
import { PanelRightClose, Send, Sparkles, Undo2 } from 'lucide-react';
import { contributions, facts } from '../demo/fixtures';
import { mockSuggestion, type AssistantTarget } from '../application/assistant-context';
import { type WorkspaceAction } from '../application/demo-service';
import { Badge, type PageProps } from './shared';

interface Message { question: string; answer: string; contexts: string[]; page: string; target?: string; before?: string; after?: string; proposalId?: string }
interface AssistantProps extends PageProps {
  contexts: string[]; setContexts: (values: string[]) => void;
  open: boolean; onClose: () => void; targets: AssistantTarget[];
  focusKey: string; setFocusKey: (key: string) => void; pageContext: string;
}
export function Assistant({ state, service, run, contexts, setContexts, open, onClose, targets, focusKey, setFocusKey, pageContext }: AssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const target = targets.find(item => item.key === focusKey);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }); }, [messages]);
  const send = () => {
    if (!question.trim()) return;
    setError('');
    const request = question.trim();
    const modifying = adding || (!/如何|怎么|为什么|是否/.test(request) && /重写|改写|修改|优化|精简|润色|补充|删除|移除|移出|新增|添加|改为/.test(request));
    let action: WorkspaceAction | undefined;
    let after: string | undefined;
    let targetLabel = target?.label;
    let answer = target ? `当前选中「${target.label}」。可以核对行动、责任范围及结果是否有事实支撑，再决定是否调整表达。` : `你正在查看「${pageContext}」。可选择下面的具体内容进行分析或修改。`;
    try {
      if (modifying) {
        if (adding || /新增资产|添加资产/.test(request)) {
          if (!title.trim()) throw new Error('请先点击“新增资产”，填写资产名称与描述。');
          action = { kind: 'add', title, organization: '', summary: request.replace(/^(新增资产|添加资产)[：:]?\s*/, '') };
          after = action.summary; targetLabel = `职业资产 > ${title} > 新资产草稿`;
        } else {
          if (!target) throw new Error('请选择要修改的目标内容；建议会明确显示应用位置。');
          ({ action, after } = mockSuggestion(state, target, request));
        }
        answer = '已生成修改预览，请核对应用位置和新内容。';
        if (target?.kind === 'bullet') answer += '本次演示只重组已有可信事实，保留数字和固定事实。';
      } else if (/缺口|补充|能力|证明/.test(request)) answer += '示例分析：先检查相关经历中的具体行动与结果；证据不足时可补材料或保留缺口，不推测指标。';
      const proposalId = action ? service.propose(action) : undefined;
      setMessages(previous => [...previous, { question: request, answer, contexts: [...contexts, ...(target ? [target.text] : [])], page: pageContext, target: targetLabel, before: adding ? undefined : target?.text, after, proposalId }]);
      setQuestion(''); setAdding(false); setTitle('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : '未生成建议，请重试。'); }
  };
  return <aside id="ai-side-panel" className="ai-side-panel" aria-label="AI 助手面板" hidden={!open} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <header className="ai-panel-header"><div><Sparkles size={18} /><h2>AI 助手</h2><Badge>演示</Badge></div><button className="icon-button" aria-label="收起 AI 助手" onClick={onClose}><PanelRightClose size={20} /></button></header>
    <section className="ai-current-context" aria-label="当前上下文">
      <span className="field-label">当前上下文</span><p>{pageContext}</p>
      {targets.length ? <label>目标内容<select aria-label="AI 修改目标" value={target?.key ?? ''} onChange={event => setFocusKey(event.target.value)}><option value="">选择具体内容（{targets.length} 项）</option>{targets.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label> : <p className="muted">当前页面可提问，暂无可编辑目标。</p>}
      {target && <details><summary>查看当前内容</summary><p>{target.text}</p></details>}
      <details><summary>附加上下文（{contexts.length}）</summary><div className="context-chips" aria-label="已选 AI 上下文">{contexts.map((context, index) => <div key={index}><span>{context}</span><button aria-label={`移除上下文${index + 1}`} onClick={() => setContexts(contexts.filter((_, i) => i !== index))}>×</button></div>)}</div>
        <div className="context-picker">{[...contributions.map(item => `${item.title}：${state.descriptions[item.id]}`), ...facts.map(item => `${item.text}（${item.verification}）`), ...state.assetDrafts.map(item => `草稿 ${item.title}：${item.summary}`)].map(value => <label key={value}><input type="checkbox" checked={contexts.includes(value)} onChange={event => setContexts(event.target.checked ? [...contexts, value] : contexts.filter(item => item !== value))} />{value}</label>)}</div>
      </details>
    </section>
    <div className="ai-conversation" ref={scroller} role="log" aria-label="AI 对话" aria-live="polite">
      {!messages.length && <div className="ai-welcome"><Sparkles size={26} /><h3>可以直接讨论当前内容</h3><p>选择页面中的经历或 Bullet，再提出问题或修改要求。修改会先展示预览。</p><small>当前使用本地示例回复，未连接真实 AI。</small></div>}
      {messages.map((message, index) => { const proposal = state.proposals.find(item => item.id === message.proposalId); return <article className="chat-turn" key={index}>
        <div className="ai-user-message">{message.question}</div>
        <details className="ai-message-context"><summary>本轮上下文（{message.contexts.length}）</summary><p>{message.page}</p>{message.contexts.map((value, i) => <blockquote key={i}>{value}</blockquote>)}</details>
        <p className="ai-answer">{message.answer}</p>
        {proposal && <div className="proposal"><strong>应用到：{message.target}</strong>{message.before && <details><summary>修改前</summary><p>{message.before}</p></details>}<span className="field-label">修改预览</span><p className="ai-preview">{message.after}</p>
          {proposal.status === 'pending' ? <><p>是否应用到当前内容？</p><div className="ai-proposal-actions"><button className="button button-primary" onClick={() => run(() => service.applyProposal(proposal.id), '已应用')}>应用修改</button><button className="button button-secondary" onClick={() => service.dismissProposal(proposal.id)}>暂不应用</button></div></> : <div className="ai-proposal-actions"><Badge>{proposal.status === 'applied' ? '已应用' : proposal.status === 'undone' ? '已撤销' : '暂不应用'}</Badge>{proposal.status === 'applied' && state.undo?.proposalId === proposal.id && <button className="text-button" onClick={() => run(() => service.undoLastProposal(), '已撤销最近一次 AI 修改')}><Undo2 size={14} />撤销修改</button>}</div>}
        </div>}
      </article>; })}
    </div>
    <footer className="ai-composer">
      <div className="ai-shortcuts"><button onClick={() => { setAdding(false); setQuestion('请分析当前内容'); input.current?.focus(); }}>分析内容</button><button onClick={() => { setAdding(false); setQuestion('请重写当前内容'); input.current?.focus(); }}>重写内容</button>{pageContext === '职业资产' && <button onClick={() => { setAdding(true); setQuestion(''); }}>新增资产</button>}</div>
      <form onSubmit={event => { event.preventDefault(); send(); }}>
        {adding && <label className="ai-new-title">新增资产名称<input required value={title} onChange={event => setTitle(event.target.value)} maxLength={80} /><button type="button" className="text-button" onClick={() => setAdding(false)}>取消新增</button></label>}
        <textarea ref={input} aria-label="发送给 AI 助手的内容" required value={question} onChange={event => setQuestion(event.target.value)} placeholder={adding ? '输入新资产的经历描述…' : '针对当前内容提问，或要求修改…'} rows={3} />
        {error && <p className="ai-error" role="alert">{error}</p>}
        <div className="ai-input-footer"><small>建议经你确认后才会应用</small><button className="button button-primary" aria-label="发送" disabled={!question.trim()}><Send size={15} /></button></div>
      </form>
    </footer>
  </aside>;
}
