'use client';

import { useState } from 'react';
import { Bot, Loader2, X } from 'lucide-react';
import { summarizePageContext } from '@/lib/api';
import { toast } from 'sonner';

interface PageSummarizerProps {
    sessionId?: string | null;
    activeTab?: string;
    model?: string;
}

export default function PageSummarizer({ sessionId, activeTab, model = 'llama-3.1-8b-instant' }: PageSummarizerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSummarize = async () => {
        setIsOpen(true);
        if (summary) return; // Don't refetch if we already have it for this state

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
            setSummary(res.summary);
        } catch (error: any) {
            toast.error(error.message || "Failed to generate summary");
            setIsOpen(false);
        } finally {
            setLoading(false);
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
                        <h3 className="font-semibold text-sm">AI Page Summary</h3>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto text-sm leading-relaxed text-foreground/80">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                            <p className="text-xs">Analyzing page context...</p>
                        </div>
                    ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            {summary.split('\n').map((line, i) => (
                                <p key={i} className="mb-2 last:mb-0">{line}</p>
                            ))}
                        </div>
                    )}
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
