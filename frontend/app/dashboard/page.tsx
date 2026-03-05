'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Database, Rows3, Columns3, ArrowLeft, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import ChatInterface from '@/components/ChatInterface';
import AutoInsightsPanel from '@/components/AutoInsightsPanel';
import AnomalyPanel from '@/components/AnomalyPanel';
import DataPreviewTable from '@/components/DataPreviewTable';
import DataVisualizationPanel from '@/components/DataVisualizationPanel';
import ForumPanel from '@/components/ForumPanel';
import PageSummarizer from '@/components/PageSummarizer';

const MODELS = [
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', desc: 'Fastest & Efficient' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', desc: 'Most Powerful' },
    { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', desc: 'Newest · Best Context' },
    { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick', desc: 'Newest · High Quality' },
];

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session');

    const [schema, setSchema] = useState<any>(null);
    const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
    const [activeTab, setActiveTab] = useState('chat');
    const [user, setUser] = useState<{ email: string; name: string } | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('insightai_user');
        if (stored) {
            try { setUser(JSON.parse(stored)); } catch {}
        }
    }, []);

    const handleSignOut = () => {
        localStorage.removeItem('insightai_user');
        router.push('/auth');
    };

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
                        {/* Intelligence Model Selector */}
                        <div className="space-y-4">
                            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60">
                                Intelligence Model
                            </p>
                            <div className="space-y-2">
                                {MODELS.map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedModel(m.id)}
                                        className={[
                                            'w-full text-left px-4 py-3 rounded-2xl border transition-all group relative overflow-hidden',
                                            selectedModel === m.id
                                                ? 'bg-violet-500/10 border-violet-500/30 ring-1 ring-violet-500/20'
                                                : 'bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-border'
                                        ].join(' ')}
                                    >
                                        <div className="relative z-10 flex flex-col">
                                            <span className={[
                                                'text-sm font-semibold transition-colors',
                                                selectedModel === m.id ? 'text-violet-600' : 'text-foreground/80 group-hover:text-foreground'
                                            ].join(' ')}>
                                                {m.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/70">{m.desc}</span>
                                        </div>
                                        {selectedModel === m.id && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

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

                    {/* User profile + sign out */}
                    <div className="border-t p-4 space-y-2 bg-muted/20">
                        {user && (
                            <div className="flex items-center gap-3 rounded-xl bg-background border px-3 py-2.5">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #7C3AED, #6366F1)' }}>
                                    {(user.name?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {user.name && (
                                        <p className="text-xs font-semibold truncate">{user.name}</p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={() => router.push('/')}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" /> New Dataset
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 transition-all"
                                title="Sign out"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                            </button>
                        </div>
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
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                            <TabsList className="flex w-fit items-center gap-1 rounded-2xl bg-muted/50 p-1.5 border border-border/50">
                                <TabsTrigger value="chat" className="rounded-xl px-5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md">Ask a Question</TabsTrigger>
                                <TabsTrigger value="insights" className="rounded-xl px-5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md">Auto Insights</TabsTrigger>
                                <TabsTrigger value="anomalies" className="rounded-xl px-5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md">Anomalies</TabsTrigger>
                                <TabsTrigger value="raw" className="rounded-xl px-5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md">Raw Data</TabsTrigger>
                                <TabsTrigger value="visualize" className="rounded-xl px-5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md">Visualize</TabsTrigger>
                                <TabsTrigger value="forum" className="rounded-xl px-5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md">Forum</TabsTrigger>
                            </TabsList>

                            <TabsContent value="chat" className="mt-0 focus-visible:outline-none">
                                <ChatInterface sessionId={sessionId} schema={schema} model={selectedModel} />
                            </TabsContent>

                            <TabsContent value="insights" className="mt-0 focus-visible:outline-none">
                                <AutoInsightsPanel sessionId={sessionId} model={selectedModel} />
                            </TabsContent>


                            <TabsContent value="anomalies" className="mt-0 focus-visible:outline-none">
                                <AnomalyPanel sessionId={sessionId} />
                            </TabsContent>

                            <TabsContent value="raw" className="mt-0 focus-visible:outline-none">
                                <DataPreviewTable sessionId={sessionId} />
                            </TabsContent>

                            <TabsContent value="visualize" className="mt-0 focus-visible:outline-none">
                                <DataVisualizationPanel sessionId={sessionId} model={selectedModel} />
                            </TabsContent>

                            <TabsContent value="forum" className="mt-0 focus-visible:outline-none">
                                <ForumPanel />
                            </TabsContent>
                        </Tabs>
                    </div>
                </main>
            </div>
            
            <PageSummarizer 
                sessionId={sessionId} 
                activeTab={activeTab} 
                model={selectedModel} 
            />
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
