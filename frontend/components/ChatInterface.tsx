'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, AlertTriangle, RefreshCw, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { chatWithData, getSuggestedQuestions } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
    role: 'user' | 'assistant';
    content: string;
    isError?: boolean;
}

interface ChatInterfaceProps {
    sessionId: string;
    schema?: any;
    model?: string;
}

// ─── Session Expired Screen ───────────────────────────────────────────────────

function SessionExpiredScreen() {
    const router = useRouter();
    return (
        <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-7 w-7 text-amber-500" />
            </div>
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Session Expired</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                    The server restarted and your session was cleared. Please re-upload your dataset to continue.
                </p>
            </div>
            <Button
                onClick={() => router.push('/')}
                className="gap-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl"
            >
                <RefreshCw className="h-4 w-4" />
                Re-upload Dataset
            </Button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatInterface({ sessionId, schema, model = 'llama-3.1-8b-instant' }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);

    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);

    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch smart suggestions
    useEffect(() => {
        let mounted = true;
        async function fetchSuggestions() {
            setLoadingSuggestions(true);
            try {
                const res = await getSuggestedQuestions(sessionId, model);
                if (mounted && res?.questions) setSuggestedQuestions(res.questions);
            } catch {
                if (mounted) setSuggestedQuestions([
                    'Summarize this dataset',
                    'What are the key trends?',
                    'Show me top 5 records',
                    'What columns are available?',
                ]);
            } finally {
                if (mounted) setLoadingSuggestions(false);
            }
        }
        fetchSuggestions();
        return () => { mounted = false; };
    }, [sessionId, model]);

    // Smart auto-scroll: only when near bottom
    useEffect(() => {
        const el = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
        if (!el) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom < 150) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading]);

    const sendMessage = useCallback(async (question: string) => {
        const q = question.trim();
        if (!q || loading) return;

        const userMsg: Message = { role: 'user', content: q };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Build the conversation history (all messages so far + this new one)
            const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
            const res = await chatWithData(history, sessionId, model);

            const assistantMsg: Message = {
                role: 'assistant',
                content: res.response ?? 'I could not generate a response. Please try again.',
            };
            setMessages(prev => [...prev, assistantMsg]);

        } catch (err: any) {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail;
            let msg = typeof detail === 'string' ? detail : (typeof detail === 'object' ? detail.error : undefined)
                ?? err?.message ?? 'Something went wrong.';

            // Session expired
            if (status === 410 || msg.toLowerCase().includes('session expired')) {
                setSessionExpired(true);
                setMessages(prev => prev.slice(0, -1));
                setLoading(false);
                return;
            }

            // Network issues
            if (msg === 'Network Error' || err?.code === 'ERR_NETWORK') {
                msg = 'Could not reach the server. Please check that the backend is running.';
            }

            const errMsg: Message = { role: 'assistant', content: msg, isError: true };
            setMessages(prev => [...prev.slice(0, -1), { role: 'user', content: q }, errMsg]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    }, [sessionId, model, loading, messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    return (
        <div className="flex h-[700px] flex-col rounded-2xl border bg-card shadow-sm overflow-hidden border-border/50">
            {sessionExpired ? <SessionExpiredScreen /> : (
                <>
                    {/* ── Message history ──────────────────────────────── */}
                    <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4">
                        {messages.length === 0 && !loading ? (
                            /* Empty state */
                            <div className="flex h-full flex-col items-center justify-center gap-6 py-8 text-center animate-in fade-in duration-500">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 ring-4 ring-violet-100/50 dark:ring-violet-900/20">
                                    <Bot className="h-7 w-7 text-violet-500" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-semibold text-foreground">Ask anything about your data</h3>
                                    <p className="text-sm text-muted-foreground w-64 md:w-80">
                                        I have full knowledge of your dataset. Ask me anything — trends, summaries, comparisons, or specific values.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 w-full max-w-lg mt-2">
                                    {loadingSuggestions ? (
                                        [0, 1, 2, 3].map(i => (
                                            <div key={i} className="rounded-xl border border-border/50 bg-background/50 p-4 h-[72px] animate-pulse" />
                                        ))
                                    ) : (
                                        suggestedQuestions.map((s, i) => (
                                            <button
                                                key={i}
                                                onClick={() => sendMessage(s)}
                                                className="group flex flex-col justify-center rounded-xl border border-border/50 bg-background/50 p-4 text-left text-sm font-medium text-muted-foreground transition-all hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-600 shadow-sm"
                                            >
                                                <span className="line-clamp-2 leading-relaxed">{s}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5 pb-2">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'assistant' && (
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40 mt-1">
                                                <Bot className="h-3.5 w-3.5 text-violet-600" />
                                            </div>
                                        )}
                                        <div className={`max-w-[80%] ${msg.role === 'user' ? '' : 'flex-1 max-w-[90%]'}`}>
                                            {msg.role === 'user' ? (
                                                <div className="rounded-2xl rounded-tr-sm bg-violet-600 px-4 py-2.5 text-sm text-white shadow-md shadow-violet-500/20">
                                                    {msg.content}
                                                </div>
                                            ) : msg.isError ? (
                                                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                                                    ⚠️ {msg.content}
                                                </div>
                                            ) : (
                                                <div className="rounded-2xl rounded-tl-sm bg-muted/50 border border-border/40 px-4 py-3 text-sm text-foreground leading-relaxed">
                                                    <ReactMarkdown
                                                        components={{
                                                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                                            em: ({ children }) => <em className="italic">{children}</em>,
                                                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                                                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                                                            li: ({ children }) => <li className="text-sm">{children}</li>,
                                                            h1: ({ children }) => <h1 className="font-bold text-base mb-1">{children}</h1>,
                                                            h2: ({ children }) => <h2 className="font-semibold text-sm mb-1">{children}</h2>,
                                                            h3: ({ children }) => <h3 className="font-semibold text-sm mb-1">{children}</h3>,
                                                            code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>,
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 mt-1">
                                                <User className="h-3.5 w-3.5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Typing indicator */}
                                {loading && (
                                    <div className="flex gap-3 justify-start">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40 mt-1">
                                            <Bot className="h-3.5 w-3.5 text-violet-600" />
                                        </div>
                                        <div className="rounded-2xl rounded-tl-sm bg-muted/50 border border-border/40 px-4 py-3">
                                            <div className="flex gap-1.5 items-center h-4">
                                                <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.3s]" />
                                                <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.15s]" />
                                                <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={bottomRef} />
                            </div>
                        )}
                    </ScrollArea>

                    {/* ── Input bar ────────────────────────────────────── */}
                    <div className="border-t bg-card px-4 py-3">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me anything about your data…"
                                disabled={loading}
                                className="flex-1 rounded-xl border-muted bg-muted/40 focus:border-violet-400 focus:ring-violet-400/30"
                            />
                            <Button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="rounded-xl bg-violet-600 px-4 hover:bg-violet-500 disabled:opacity-40"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
}
