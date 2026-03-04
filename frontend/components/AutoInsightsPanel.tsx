'use client';

import { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, BarChart3, Lightbulb } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { getAutoInsights } from '@/lib/api';

interface AutoInsightsPanelProps {
    sessionId: string;
}

// ── Correlation Heatmap (same helper as AnomalyPanel) ────────────────────────

function corrColor(value: number): string {
    const v = Math.max(-1, Math.min(1, value));
    if (v >= 0) {
        return `rgb(255,${Math.round(249 - v * 249)},${Math.round(250 - v * 250)})`;
    }
    const abs = Math.abs(v);
    return `rgb(${Math.round(249 - abs * 190)},${Math.round(250 - abs * 127)},250)`;
}

function CorrelationHeatmap({ columns, data }: { columns: string[]; data: number[][] }) {
    if (!columns.length) return null;
    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Correlation Matrix
            </p>
            <div className="overflow-x-auto rounded-xl border">
                <table className="text-xs border-collapse">
                    <thead>
                        <tr>
                            <th className="px-2 py-1.5 bg-muted/60 font-semibold text-muted-foreground" />
                            {columns.map((c) => (
                                <th key={c} className="px-2 py-1.5 bg-muted/60 font-semibold text-center text-muted-foreground whitespace-nowrap">
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, ri) => (
                            <tr key={ri}>
                                <td className="px-2 py-1.5 font-semibold text-muted-foreground bg-muted/60 whitespace-nowrap">
                                    {columns[ri]}
                                </td>
                                {row.map((val, ci) => (
                                    <td
                                        key={ci}
                                        className="px-3 py-1.5 text-center font-mono font-medium transition-colors"
                                        style={{
                                            backgroundColor: corrColor(val),
                                            color: Math.abs(val) > 0.5 ? '#1e1b4b' : '#374151',
                                            minWidth: 52,
                                        }}
                                        title={`${columns[ri]} × ${columns[ci]}: ${val.toFixed(2)}`}
                                    >
                                        {val.toFixed(2)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Icon set for insight cards ────────────────────────────────────────────────
const ICONS = [
    <TrendingUp key="t" className="h-5 w-5 text-indigo-400" />,
    <BarChart3 key="b" className="h-5 w-5 text-cyan-400" />,
    <Lightbulb key="l" className="h-5 w-5 text-amber-400" />,
];

const GRADIENTS = [
    'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20',
    'from-cyan-500/10   to-cyan-500/5   border-cyan-500/20',
    'from-amber-500/10  to-amber-500/5  border-amber-500/20',
];

// ── Main component ────────────────────────────────────────────────────────────

export default function AutoInsightsPanel({ sessionId }: AutoInsightsPanelProps) {
    const [insights, setInsights] = useState<string[]>([]);
    const [corr, setCorr] = useState<{ columns: string[]; data: number[][] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function fetch() {
            try {
                const res = await getAutoInsights(sessionId);
                if (!cancelled) {
                    setInsights(res.insights ?? []);
                    setCorr(res.correlation ?? null);
                }
            } catch (e: any) {
                if (!cancelled)
                    setError(e?.response?.data?.detail ?? e?.message ?? 'Failed to load insights');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetch();
        return () => { cancelled = true; };
    }, [sessionId]);

    // ── Loading ─────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="rounded-2xl border p-5 space-y-3">
                            <Skeleton className="h-5 w-5 rounded-full" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-4/5" />
                            <Skeleton className="h-3 w-3/5" />
                        </div>
                    ))}
                </div>
                <Skeleton className="h-40 w-full rounded-xl" />
            </div>
        );
    }

    // ── Error ───────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-destructive">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                <h2 className="text-sm font-semibold text-foreground">AI-Generated Insights</h2>
                <span className="text-xs text-muted-foreground">(based on your dataset)</span>
            </div>

            {/* Insight cards grid */}
            <div className="grid gap-4 sm:grid-cols-3">
                {insights.map((text, i) => (
                    <Card
                        key={i}
                        className={`rounded-2xl border bg-gradient-to-br ${GRADIENTS[i % 3]} shadow-sm`}
                    >
                        <CardContent className="p-5 space-y-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background/60">
                                {ICONS[i % 3]}
                            </div>
                            <p className="text-sm leading-relaxed text-foreground">{text}</p>
                        </CardContent>
                    </Card>
                ))}

                {insights.length === 0 && (
                    <p className="col-span-3 text-center text-sm text-muted-foreground py-8">
                        No insights available for this dataset.
                    </p>
                )}
            </div>

            {/* Correlation heatmap */}
            {corr && corr.columns.length > 0 && (
                <CorrelationHeatmap columns={corr.columns} data={corr.data} />
            )}

            {/* Disclaimer */}
            <p className="text-[10px] text-muted-foreground">
                AI-generated insights — verify before making business decisions.
            </p>
        </div>
    );
}
