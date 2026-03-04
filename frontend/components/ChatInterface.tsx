'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Send, ChevronDown, ChevronUp, Code2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import InsightCard from '@/components/InsightCard';
import ChartRenderer from '@/components/ChartRenderer';
import { queryData, getSuggestedQuestions } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sql?: string;
    chartType?: string;
    data?: Record<string, any>[];
    columns?: string[];
    insight?: string;
    rowCount?: number;
}

interface ChatInterfaceProps {
    sessionId: string;
    schema?: any;
    model?: string;
}

// ─── SQL Collapsible ──────────────────────────────────────────────────────────

function SqlBlock({ sql }: { sql: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="mt-2 rounded-xl border overflow-hidden text-xs">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex w-full items-center gap-2 bg-muted/60 px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
                <Code2 className="h-3.5 w-3.5 text-violet-400" />
                <span className="font-mono font-semibold">SQL Query</span>
                <span className="ml-auto">{open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</span>
            </button>
            {open && (
                <>
                    <Separator />
                    <SyntaxHighlighter
                        language="sql"
                        style={oneDark}
                        customStyle={{ margin: 0, borderRadius: 0, fontSize: 12, padding: '12px 16px' }}
                        wrapLongLines
                    >
                        {sql}
                    </SyntaxHighlighter>
                </>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatInterface({ sessionId, schema, model = 'llama-3.1-8b-instant' }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Smart suggestions states
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);
    
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch smart suggestions on mount or when session/model changes
    useEffect(() => {
        let mounted = true;
        async function fetchSuggestions() {
            setLoadingSuggestions(true);
            try {
                const res = await getSuggestedQuestions(sessionId, model);
                if (mounted && res?.questions) {
                    setSuggestedQuestions(res.questions);
                }
            } catch (error) {
                console.error("Failed to fetch smart questions:", error);
                if (mounted) {
                    setSuggestedQuestions([
                        'Show total revenue by region',
                        'What are the top 5 products?',
                        'Show monthly trends',
                        'Which region has the highest cost?',
                    ]);
                }
            } finally {
                if (mounted) setLoadingSuggestions(false);
            }
        }
        
        fetchSuggestions();
        return () => { mounted = false; };
    }, [sessionId, model]);

    // Auto-scroll to bottom whenever messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const sendMessage = useCallback(async (question: string) => {
        const q = question.trim();
        if (!q || loading) return;

        const userMsg: Message = { role: 'user', content: q };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await queryData(q, sessionId, model);
            const assistantMsg: Message = {
                role: 'assistant',
                content: res.insight ?? 'Here are the results:',
                sql: res.sql,
                chartType: res.chart_type,
                data: res.data,
                columns: res.columns,
                insight: res.insight,
                rowCount: res.row_count,
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            const msg =
                typeof detail === 'object' ? detail.error :
                    typeof detail === 'string' ? detail :
                        err?.message ?? 'Something went wrong.';
            toast.error(msg);
            // Remove the optimistic user bubble on error
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    }, [sessionId, loading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    return (
        <div className="flex h-[700px] flex-col rounded-2xl border bg-card shadow-sm overflow-hidden border-border/50">

            {/* ── Message history ─────────────────────────────────── */}
            <ScrollArea className="flex-1 px-4 py-4">
                {messages.length === 0 && !loading ? (
                    /* Empty state — suggestion chips */
                    <div className="flex h-full flex-col items-center justify-center gap-6 py-8 text-center animate-in fade-in duration-500">
                        <div className="space-y-1">
                            <h3 className="text-xl font-semibold text-foreground">Ask anything about your data</h3>
                            <p className="text-sm text-muted-foreground w-64 md:w-80">
                                Click a smart suggestion generated from your dataset, or type your own question.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full max-w-lg mt-4">
                            {loadingSuggestions ? (
                                <>
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} className="rounded-xl border border-border/50 bg-background/50 p-4 h-[72px] animate-pulse" />
                                    ))}
                                </>
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
                    <div className="space-y-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'user' ? (
                                    /* User bubble */
                                    <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-violet-600 px-4 py-2.5 text-sm text-white shadow-md shadow-violet-500/20">
                                        {msg.content}
                                    </div>
                                ) : (
                                    /* Assistant card */
                                    <div className="w-full max-w-[96%] space-y-3">
                                        {msg.insight && (
                                            <InsightCard insight={msg.insight} rowCount={msg.rowCount ?? 0} />
                                        )}
                                        {msg.data && msg.columns && msg.chartType && (
                                            <div className="rounded-xl border bg-background p-3">
                                                <ChartRenderer
                                                    chartType={msg.chartType}
                                                    data={msg.data}
                                                    columns={msg.columns}
                                                />
                                            </div>
                                        )}
                                        {msg.sql && <SqlBlock sql={msg.sql} />}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Loading skeleton */}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="w-full max-w-[96%] space-y-2 rounded-xl border bg-muted/30 p-4">
                                    <Skeleton className="h-3 w-4/5 rounded-full" />
                                    <Skeleton className="h-3 w-3/5 rounded-full" />
                                    <Skeleton className="h-3 w-2/3 rounded-full" />
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>
                )}
            </ScrollArea>

            {/* ── Input bar ───────────────────────────────────────── */}
            <div className="border-t bg-card px-4 py-3">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about your dataset…"
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
        </div>
    );
}
