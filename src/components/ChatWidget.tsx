import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Bot, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/apiClient';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

/**
 * Floating GRC assistant. Posts the running conversation to POST /ai/chat
 * (Ollama-backed) and renders the reply. Mounted once in the app Shell so it
 * is available on every authenticated page.
 */
const ChatWidget: React.FC<{ context?: 'partner' | 'admin' }> = ({ context = 'admin' }) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  const send = async () => {
    const text = draft.trim();
    if (!text || loading) return;
    const next: ChatMsg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setDraft('');
    setLoading(true);
    try {
      const res = await api.post<{ reply: string }>('/ai/chat', { messages: next, context });
      setMessages((m) => [...m, { role: 'assistant', content: res?.reply || '…' }]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: err?.message || 'Sorry, something went wrong.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className={`fixed bottom-5 z-[1000] ${isAr ? 'left-5' : 'right-5'}`}>
      {open && (
        <div className="mb-3 flex h-[480px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
                <Bot size={18} />
              </span>
              <div>
                <div className="text-sm font-semibold leading-tight">Comply.now assistant</div>
                <div className="text-[11px] text-white/80">Ask about the admin console</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-white/85 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                👋 Hi! I can help with tenants, templates, provisioning, billing and
                platform metrics. What do you need?
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                  <Loader2 size={14} className="animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Type a message…"
              className="max-h-28 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <button
              onClick={send}
              disabled={loading || !draft.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-xl transition-transform hover:scale-105"
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
};

export default ChatWidget;
