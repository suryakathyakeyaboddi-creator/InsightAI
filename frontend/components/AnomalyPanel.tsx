'use client';

import { useEffect, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getAnomalies, getAutoInsights } from '@/lib/api';

interface AnomalyPanelProps {
    sessionId: string;
}

// ─── Correlation Heatmap ─────────────────────────────────────────────────────

function corrColor(value: number): string {
    // Interpolates: strong-negative → blue(#3B82F6), zero → white(#F9FAFB), strong-positive → red(#EF4444)
    const v = Math.max(-1, Math.min(1, value));
    if (v >= 0) {
        // white → red
        const r = Math.round(255);
        const g = Math.round(249 - v * 249);
        const b = Math.round(250 - v * 250);
        return `rgb(${r},${g},${b})`;
    } else {
        // white → blue
        const abs = Math.abs(v);
        const r = Math.round(249 - abs * 190);
        const g = Math.round(250 - abs * 127);
        const b = Math.round(250);
        return `rgb(${r},${g},${b})`;
    }
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
                            <th className="px-2 py-1 bg-muted/50 font-semibold text-left text-muted-foreground" />
                            {columns.map((c) => (
                                <th key={c} className="px-2 py-1 bg-muted/50 font-semibold text-center text-muted-foreground whitespace-nowrap">
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, ri) => (
                            <tr key={ri}>
                                <td className="px-2 py-1 font-semibold text-muted-foreground bg-muted/50 whitespace-nowrap">
                                    {columns[ri]}
                                </td>
                                {row.map((val, ci) => (
                                    <td
                                        key={ci}
                                        className="px-3 py-1.5 text-center font-mono font-medium transition-colors"
                                        style={{
                                            backgroundColor: corrColor(val),
                                            color: Math.abs(val) > 0.5 ? '#fff' : '#374151',
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnomalyPanel({ sessionId }: AnomalyPanelProps) {
    const [loading, setLoading] = useState(true);
    const [anomalyData, setAnomalyData] = useState<any>(null);
    const [corrData, setCorrData] = useState<{ columns: string[]; data: number[][] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function fetchAll() {
            try {
                const [anom, insights] = await Promise.all([
                    getAnomalies(sessionId),
                    getAutoInsights(sessionId),
                ]);
                if (!cancelled) {
                    setAnomalyData(anom);
                    setCorrData(insights.correlation ?? null);
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.response?.data?.detail ?? e?.message ?? 'Failed to load');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchAll();
        return () => { cancelled = true; };
    }, [sessionId]);

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-4 p-6 rounded-2xl border bg-card">
                <Skeleton className="h-6 w-52" />
                <Skeleton className="h-[300px] w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
            </div>
        );
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-destructive">
                {error}
            </div>
        );
    }

    const {
        total_anomalies = 0,
        percentage = 0,
        anomaly_rows = [] as Record<string, any>[],
        full_data = [] as Record<string, any>[],
    } = anomalyData ?? {};

    // Find first pair of numeric columns for scatter axes
    const numericKeys = full_data.length > 0
        ? Object.keys(full_data[0]).filter(
            (k) => k !== 'is_anomaly' && typeof full_data[0][k] === 'number'
        )
        : [];
    const xKey = numericKeys[0];
    const yKey = numericKeys[1] ?? numericKeys[0];

    // Annotate points with anomaly flag for coloring
    const scatterPoints = full_data.map((row: any) => ({
        x: row[xKey],
        y: row[yKey],
        anomaly: row.is_anomaly === true,
    }));
    const normalPoints = scatterPoints.filter((p: any) => !p.anomaly);
    const anomPoints = scatterPoints.filter((p: any) => p.anomaly);

    // Top 5 anomaly rows columns (drop is_anomaly)
    const tableColumns =
        anomaly_rows.length > 0
            ? Object.keys(anomaly_rows[0]).filter((k) => k !== 'is_anomaly')
            : [];
    const topAnomalies = anomaly_rows.slice(0, 5);

    return (
        <div className="space-y-6">
            {/* ── Summary badge ─────────────────────────────────── */}
            <div>
                <Badge
                    className={`text-sm px-4 py-1.5 rounded-full font-semibold ${total_anomalies > 0
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                >
                    {total_anomalies} anomal{total_anomalies === 1 ? 'y' : 'ies'} detected ({percentage}% of data)
                </Badge>
            </div>

            {/* ── Scatter chart ─────────────────────────────────── */}
            {xKey && yKey && (
                <div className="rounded-xl border bg-card p-4 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {xKey} vs {yKey} — Anomaly Scatter
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                            <XAxis
                                dataKey="x"
                                name={xKey}
                                tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.55 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                dataKey="y"
                                name={yKey}
                                tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.55 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <ZAxis range={[48, 48]} />
                            <Tooltip
                                contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid rgba(128,128,128,.2)' }}
                                formatter={(val: any, name: string | undefined) => [val, name === 'x' ? xKey : yKey]}
                            />
                            {/* Normal points – indigo */}
                            <Scatter
                                name="Normal"
                                data={normalPoints}
                                fill="#6366F1"
                                fillOpacity={0.65}
                            />
                            {/* Anomaly points – red */}
                            <Scatter
                                name="Anomaly"
                                data={anomPoints}
                                fill="#EF4444"
                                fillOpacity={0.9}
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" /> Normal
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> Anomaly
                        </span>
                    </div>
                </div>
            )}

            {/* ── Top anomaly rows table ─────────────────────────── */}
            {topAnomalies.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Top anomalous rows
                    </p>
                    <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    {tableColumns.map((col) => (
                                        <th key={col} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {topAnomalies.map((row: any, i: number) => (
                                    <tr key={i} className="border-b last:border-0 bg-red-50 dark:bg-red-950/30">
                                        {tableColumns.map((col) => (
                                            <td key={col} className="px-3 py-2 font-mono text-red-700 dark:text-red-400">
                                                {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {total_anomalies === 0 && (
                <div className="flex h-24 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                    No anomalous rows to display — dataset looks clean!
                </div>
            )}

            {/* ── Correlation heatmap ───────────────────────────── */}
            {corrData && corrData.columns.length > 0 && (
                <CorrelationHeatmap columns={corrData.columns} data={corrData.data} />
            )}
        </div>
    );
}
