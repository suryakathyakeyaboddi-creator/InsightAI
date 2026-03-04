'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, X, Send } from 'lucide-react';
import { summarizePageContext, chatPageContext } from '@/lib/api';
import { toast } from 'sonner';

interface PageSummarizerProps {
    sessionId?: string | null;
    activeTab?: string;
    model?: string;
}

export default function PageSummarizer({ sessionId, activeTab, model = 'llama-3.1-8b-instant' }: PageSummarizerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, chatLoading]);

    const handleSummarize = async () => {
        setIsOpen(true);
        if (messages.length > 0) return; // Don't refetch if we already have it for this state

        setLoading(true);
        try {
            // Provide a lightweight hint of what we are looking at to the LLM
            let dataSummaryHint = undefined;
            if (activeTab === 'chat') dataSummaryHint = "User is looking at the Chat Interface, potentially asking questions about their data.";
            if (activeTab === 'insights') dataSummaryHint = "User is looking at Auto-Generated AI Insights cards and a Correlation Matrix.";
            if (activeTab === 'anomalies') dataSummaryHint = "User is looking at the Anomaly Detection results table.";
            if (activeTab === 'raw') dataSummaryHint = "User is looking at a raw preview table of their dataset.";

            const res = await summarizePageContext(
                window.location.pathname,
                sessionId || undefined,
                activeTab,
                dataSummaryHint,
                model
            );
            setMessages([{ role: 'assistant', content: res.summary }]);
        } catch (error: any) {
            toast.error(error.message || "Failed to generate summary");
            setIsOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || chatLoading) return;

        const newMessages = [...messages, { role: 'user', content: text }];
        setMessages(newMessages);
        setInput('');
        setChatLoading(true);

        try {
            let dataSummaryHint = undefined;
            if (activeTab === 'chat') dataSummaryHint = "User is looking at the Chat Interface.";
            if (activeTab === 'insights') dataSummaryHint = "User is looking at Auto-Generated AI Insights cards and a Correlation Matrix.";
            if (activeTab === 'anomalies') dataSummaryHint = "User is looking at the Anomaly Detection results table.";
            if (activeTab === 'raw') dataSummaryHint = "User is looking at a raw preview table of their dataset.";
            
            const res = await chatPageContext(
                newMessages,
                window.location.pathname,
                sessionId || undefined,
                activeTab,
                dataSummaryHint,
                model
            );
            setMessages([...newMessages, { role: 'assistant', content: res.response }]);
        } catch (error: any) {
            toast.error(error.message || "Chat failed");
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            {/* Slide-out Panel */}
            <div className={`
                transition-all duration-300 origin-bottom-right
                ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
                w-80 md:w-96 rounded-2xl bg-card border shadow-2xl overflow-hidden
            `}>
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-violet-500" />
                        <h3 className="font-semibold text-sm">AI Page Summary & Chat</h3>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                
                <div className="flex flex-col h-[60vh]">
                    <div className="flex-1 p-4 overflow-y-auto text-sm leading-relaxed text-foreground/80 space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                                <p className="text-xs">Analyzing page context...</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`
                                        max-w-[85%] rounded-2xl px-4 py-2.5 
                                        ${msg.role === 'user' 
                                            ? 'bg-violet-600 text-white rounded-tr-sm shadow-md shadow-violet-500/20' 
                                            : 'bg-muted/50 rounded-tl-sm text-foreground/90 prose prose-sm dark:prose-invert'}
                                    `}>
                                        {msg.role === 'assistant' ? (
                                            msg.content.split('\n').map((line, j) => (
                                                <p key={j} className="mb-2 last:mb-0">{line}</p>
                                            ))
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        {chatLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                                    <div className="h-1.5 w-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="h-1.5 w-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="h-1.5 w-1.5 bg-violet-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    <form onSubmit={handleSendMessage} className="p-3 bg-background border-t mt-auto">
                        <div className="relative flex items-center">
                            <input 
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a question about this page..."
                                className="w-full bg-muted/50 border border-border/50 rounded-full pl-4 pr-12 py-2 text-sm outline-none focus:ring-1 focus:ring-violet-500 transition-shadow"
                                disabled={loading || chatLoading}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || loading || chatLoading}
                                className="absolute right-1 text-white bg-violet-600 hover:bg-violet-500 rounded-full p-1.5 disabled:opacity-50 transition-colors"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Floating Action Button */}
            <button
                onClick={handleSummarize}
                className="group flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl shadow-violet-500/30 hover:bg-violet-500 hover:scale-105 active:scale-95 transition-all"
                title="Summarize Page"
            >
                <Bot className="h-6 w-6 group-hover:animate-pulse" />
            </button>
        </div>
    );
}
