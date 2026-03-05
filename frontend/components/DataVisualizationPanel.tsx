'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, RefreshCw } from 'lucide-react';
import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChartConfig {
    id: string;
    title: string;
    subtitle: string;
    type: 'bar' | 'line';
    xKey: string;
    valueKey: string;
    data: Record<string, any>[];
    color: string;
}

interface StatRow {
    col: string;
    min: number;
    max: number;
    mean: number;
    median: number;
}

interface VisualizeResponse {
    charts: ChartConfig[];
    stats: StatRow[];
    row_count: number;
    col_count: number;
}

interface DataVisualizationPanelProps {
    sessionId: string;
    model?: string;
}

// ─── Business Tip Card ─────────────────────────────────────────────────────────

function BusinessTipCard({ sessionId, model }: { sessionId: string; model: string }) {
    const [tip, setTip] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchTip = useCallback(async () => {
        setLoading(true);
        setTip(null);
        try {
            const res = await axios.post(`${BASE}/api/business-tip`, {
                session_id: sessionId,
                model,
            });
            setTip(res.data.tip ?? null);
        } catch {
            setTip('Unable to generate a tip right now. Try again later.');
        } finally {
            setLoading(false);
        }
    }, [sessionId, model]);

    useEffect(() => { fetchTip(); }, [fetchTip]);

    return (
        <div className="relative overflow-hidden rounded-3xl p-[2px]"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24, #FDE68A, #F59E0B)' }}>
            {/* Outer glow */}
            <div className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, #F59E0B 0%, transparent 70%)' }} />

            <div
                className="relative rounded-[22px] px-7 py-6 overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #1c1400 0%, #2a1f00 40%, #1a1200 100%)',
                }}
            >
                {/* Decorative sparkle blobs */}
                <div className="pointer-events-none absolute -top-6 -right-6 h-36 w-36 rounded-full opacity-20 blur-2xl"
                    style={{ background: 'radial-gradient(circle, #FBBF24, transparent)' }} />
                <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full opacity-10 blur-2xl"
                    style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />

                <div className="relative flex items-start gap-4">
                    {/* Icon */}
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                        style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)' }}>
                        <Lightbulb className="h-5 w-5 text-amber-950" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div>
                                <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-amber-400/70">
                                    AI Business Insight
                                </p>
                                <p className="text-base font-bold text-amber-200 leading-tight">
                                    Powered by Your Data
                                </p>
                            </div>
                            <button
                                onClick={fetchTip}
                                disabled={loading}
                                title="Regenerate tip"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-40 shrink-0"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full bg-amber-500/10" />
                                <Skeleton className="h-4 w-5/6 bg-amber-500/10" />
                                <Skeleton className="h-4 w-4/5 bg-amber-500/10" />
                            </div>
                        ) : (
                            <p className="text-sm leading-relaxed text-amber-100/90">
                                {tip}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Small Chart Card ──────────────────────────────────────────────────────────

const axisStyle = { fontSize: 10, fill: 'currentColor', opacity: 0.5 };
const gridStyle = { strokeDasharray: '3 3', stroke: 'currentColor', strokeOpacity: 0.06 };
const tooltipStyle = { borderRadius: 8, fontSize: 12, border: '1px solid rgba(128,128,128,.15)' };

function MiniChart({ cfg }: { cfg: ChartConfig }) {
    return (
        <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-2">
            <div>
                <p className="text-sm font-semibold text-foreground leading-tight">{cfg.title}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{cfg.subtitle}</p>
            </div>
            <ResponsiveContainer width="100%" height={180}>
                {cfg.type === 'line' ? (
                    <LineChart data={cfg.data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                        <CartesianGrid {...gridStyle} />
                        <XAxis dataKey={cfg.xKey} tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey={cfg.valueKey} stroke={cfg.color} strokeWidth={2} dot={false} />
                    </LineChart>
                ) : (
                    <BarChart data={cfg.data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                        <CartesianGrid {...gridStyle} />
                        <XAxis dataKey={cfg.xKey} tick={axisStyle} tickLine={false} axisLine={false} interval={0}
                            angle={cfg.data.length > 6 ? -30 : 0}
                            textAnchor={cfg.data.length > 6 ? 'end' : 'middle'}
                            height={cfg.data.length > 6 ? 42 : 20} />
                        <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey={cfg.valueKey} fill={cfg.color} radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────

const STAT_COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

export default function DataVisualizationPanel({
    sessionId,
    model = 'llama-3.1-8b-instant',
}: DataVisualizationPanelProps) {
    const [data, setData] = useState<VisualizeResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`${BASE}/api/visualize`, { params: { session_id: sessionId } });
                if (mounted) setData(res.data);
            } catch (err: any) {
                const msg = err?.response?.data?.detail ?? err?.message ?? 'Failed to load visualizations.';
                if (mounted) setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();
        return () => { mounted = false; };
    }, [sessionId]);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-36 rounded-3xl" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                ⚠️ {error}
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-8">

            {/* ── ✨ Business Tip Hero ──────────────────────────────── */}
            <BusinessTipCard sessionId={sessionId} model={model} />

            {/* ── Numeric Summary Stats ─────────────────────────────── */}
            {data.stats.length > 0 && (
                <div>
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60 mb-3">
                        Numeric Summary
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                        {data.stats.map((s, i) => (
                            <div
                                key={s.col}
                                className="rounded-2xl border bg-card p-4 shadow-sm space-y-3"
                                style={{ borderTopColor: STAT_COLORS[i % STAT_COLORS.length], borderTopWidth: 3 }}
                            >
                                <p className="text-xs font-semibold text-foreground truncate">{s.col}</p>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
                                    <span className="text-muted-foreground">Min</span>
                                    <span className="font-mono font-medium text-right">{s.min.toLocaleString()}</span>
                                    <span className="text-muted-foreground">Max</span>
                                    <span className="font-mono font-medium text-right">{s.max.toLocaleString()}</span>
                                    <span className="text-muted-foreground">Mean</span>
                                    <span className="font-mono font-medium text-right">{s.mean.toLocaleString()}</span>
                                    <span className="text-muted-foreground">Median</span>
                                    <span className="font-mono font-medium text-right">{s.median.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Chart Grid ───────────────────────────────────────── */}
            {data.charts.length > 0 && (
                <div>
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60 mb-3">
                        Charts — {data.charts.length} auto-generated
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {data.charts.map(cfg => (
                            <MiniChart key={cfg.id} cfg={cfg} />
                        ))}
                    </div>
                </div>
            )}

            {data.charts.length === 0 && (
                <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-sm text-muted-foreground">
                    <span className="text-3xl">📊</span>
                    <span>No visualizable chart columns found.</span>
                </div>
            )}
        </div>
    );
}
