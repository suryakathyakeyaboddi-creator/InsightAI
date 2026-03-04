'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Database, Rows3, Columns3, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import ChatInterface from '@/components/ChatInterface';
import AutoInsightsPanel from '@/components/AutoInsightsPanel';
import AnomalyPanel from '@/components/AnomalyPanel';
import DataPreviewTable from '@/components/DataPreviewTable';

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session');

    const [schema, setSchema] = useState<any>(null);

    useEffect(() => {
        if (!sessionId) {
            router.replace('/');
            return;
        }
        const stored = sessionStorage.getItem(`schema_${sessionId}`);
        if (stored) {
            try { setSchema(JSON.parse(stored)); } catch { }
        }
    }, [sessionId, router]);

    if (!sessionId) return null;

    const columns: string[] = schema?.columns ?? [];
    const rowCount: number = schema?.row_count ?? 0;
    const datasetName: string = schema?.filename ?? 'Dataset';

    return (
        <>
            <Toaster richColors position="top-center" />
            <div className="flex h-screen overflow-hidden bg-background">
                {/* Sidebar */}
                <aside className="hidden w-72 shrink-0 flex-col border-r bg-card/80 backdrop-blur-sm md:flex shadow-xl shadow-black/5">
                    <div className="flex h-16 items-center gap-2 border-b px-6">
                        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
                            InsightAI
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                        {/* Dataset info */}
                        <div className="space-y-4">
                            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60">
                                Active Dataset
                            </p>
                            <div className="flex items-center gap-3 rounded-2xl bg-violet-500/5 border border-violet-500/10 px-4 py-3">
                                <Database className="h-5 w-5 text-violet-500 shrink-0" />
                                <span className="text-sm font-semibold truncate text-foreground">{datasetName}</span>
                            </div>
                            {schema ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1 rounded-xl bg-muted/30 p-2.5 border border-border/50">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Rows3 className="h-3 w-3" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Rows</span>
                                        </div>
                                        <span className="text-sm font-bold">{rowCount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 rounded-xl bg-muted/30 p-2.5 border border-border/50">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Columns3 className="h-3 w-3" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Cols</span>
                                        </div>
                                        <span className="text-sm font-bold">{columns.length}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            )}
                        </div>

                        {/* Column badges */}
                        {columns.length > 0 && (
                            <div className="space-y-4">
                                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60">
                                    Data Schema
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {columns.map((col) => (
                                        <Badge key={col} variant="secondary" className="rounded-lg bg-violet-500/5 text-violet-600 border-violet-500/10 hover:bg-violet-500/10 text-[11px] px-2.5 py-1 font-mono transition-all">
                                            {col}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Back link */}
                    <div className="border-t p-4 bg-muted/20">
                        <button
                            onClick={() => router.push('/')}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95 shadow-sm"
                        >
                            <ArrowLeft className="h-4 w-4" /> New Dataset
                        </button>
                    </div>
                </aside>

                {/* Main content area (Scrolls independently) */}
                <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50/50 dark:bg-transparent">
                    {/* Top bar (mobile) */}
                    <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 md:hidden bg-background/80 backdrop-blur-md">
                        <span className="text-lg font-bold">
                            Insight<span className="text-violet-500">AI</span>
                        </span>
                        <button onClick={() => router.push('/')} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                            <ArrowLeft className="h-3 w-3" /> New
                        </button>
                    </header>

                    <div className="w-full max-w-7xl mx-auto p-6 md:p-10 space-y-8">
                        <Tabs defaultValue="chat" className="space-y-8">
                            <TabsList className="flex w-fit items-center gap-1 rounded-2xl bg-muted/50 p-1.5 border border-border/50">
                                <TabsTrigger value="chat" className="rounded-xl px-5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md">Ask a Question</TabsTrigger>
                                <TabsTrigger value="insights" className="rounded-xl px-5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md">Auto Insights</TabsTrigger>
                                <TabsTrigger value="anomalies" className="rounded-xl px-5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md">Anomalies</TabsTrigger>
                                <TabsTrigger value="raw" className="rounded-xl px-5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md">Raw Data</TabsTrigger>
                            </TabsList>

                            <TabsContent value="chat" className="mt-0 focus-visible:outline-none">
                                <ChatInterface sessionId={sessionId} schema={schema} />
                            </TabsContent>

                            <TabsContent value="insights" className="mt-0 focus-visible:outline-none">
                                <AutoInsightsPanel sessionId={sessionId} />
                            </TabsContent>

                            <TabsContent value="anomalies" className="mt-0 focus-visible:outline-none">
                                <AnomalyPanel sessionId={sessionId} />
                            </TabsContent>

                            <TabsContent value="raw" className="mt-0 focus-visible:outline-none">
                                <DataPreviewTable sessionId={sessionId} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </main>
            </div>
        </>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <div className="space-y-3 text-center">
                    <Skeleton className="h-6 w-32 mx-auto" />
                    <Skeleton className="h-4 w-48 mx-auto" />
                </div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
