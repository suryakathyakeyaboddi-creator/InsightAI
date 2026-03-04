'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';

interface DataPreviewTableProps {
    sessionId: string;
}

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DataPreviewTable({ sessionId }: DataPreviewTableProps) {
    const [columns, setColumns] = useState<string[]>([]);
    const [rows, setRows] = useState<Record<string, any>[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function fetchPreview() {
            try {
                const res = await axios.get(`${BASE}/api/preview`, {
                    params: { session_id: sessionId, limit: 100 },
                });
                if (!cancelled) {
                    setColumns(res.data.columns);
                    setRows(res.data.rows);
                    setTotalRows(res.data.total_rows);
                }
            } catch (e: any) {
                if (!cancelled)
                    setError(e?.response?.data?.detail ?? e?.message ?? 'Failed to load preview');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchPreview();
        return () => { cancelled = true; };
    }, [sessionId]);

    if (loading) {
        return (
            <div className="space-y-3 p-4 rounded-2xl border bg-card">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-full rounded-lg" />
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full rounded" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-destructive">
                {error}
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No data available.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b bg-muted/60 sticky top-0">
                            {columns.map((col) => (
                                <th
                                    key={col}
                                    className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr
                                key={i}
                                className={`border-b last:border-0 transition-colors hover:bg-violet-500/5 ${i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50 dark:bg-white/5'
                                    }`}
                            >
                                {columns.map((col) => (
                                    <td key={col} className="px-3 py-2 font-mono text-foreground whitespace-nowrap">
                                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : (
                                            <span className="text-muted-foreground italic">null</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-muted-foreground text-right">
                Showing {rows.length.toLocaleString()} of {totalRows.toLocaleString()} rows
            </p>
        </div>
    );
}
