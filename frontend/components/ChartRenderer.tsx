'use client';

import {
    BarChart, Bar,
    LineChart, Line,
    PieChart, Pie, Cell,
    ScatterChart, Scatter, ZAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface ChartRendererProps {
    chartType: string;
    data: Record<string, any>[];
    columns: string[];
}

const PALETTE = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const axisStyle = { fontSize: 11, fill: 'currentColor', opacity: 0.55 };
const tooltipStyle = { borderRadius: 8, fontSize: 12, border: '1px solid rgba(128,128,128,.2)' };
const gridStyle = { strokeDasharray: '3 3', stroke: 'currentColor', strokeOpacity: 0.08 };
const commonMargin = { top: 8, right: 12, left: -8, bottom: 0 };

export default function ChartRenderer({ chartType, data, columns }: ChartRendererProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground">
                <span className="text-2xl">🔍</span>
                <span>No results found for this query.</span>
                <span className="text-xs opacity-60">Try rephrasing or use a broader search.</span>
            </div>
        );
    }

    const xKey = columns[0];
    const valueKeys = columns.slice(1);

    // Fall back to table if we only have one column — can't render a chart
    const effectiveChartType = (valueKeys.length === 0 && chartType !== 'table') ? 'table' : chartType;


    // ── Bar ──────────────────────────────────────────────────────────────────
    if (effectiveChartType === 'bar') {
        return (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={commonMargin}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} />
                    <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(99,102,241,.05)' }} />
                    {valueKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
                    {valueKeys.map((k, i) => (
                        <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} maxBarSize={52} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        );
    }

    // ── Line ─────────────────────────────────────────────────────────────────
    if (effectiveChartType === 'line') {
        return (
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={commonMargin}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} />
                    <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    {valueKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
                    {valueKeys.map((k, i) => (
                        <Line
                            key={k}
                            type="monotone"
                            dataKey={k}
                            stroke={PALETTE[i % PALETTE.length]}
                            strokeWidth={2.5}
                            dot={{ r: 3.5, fill: PALETTE[i % PALETTE.length] }}
                            activeDot={{ r: 5 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        );
    }

    // ── Pie ──────────────────────────────────────────────────────────────────
    if (effectiveChartType === 'pie') {
        const valueKey = valueKeys[0] ?? xKey;
        return (
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey={valueKey}
                        nameKey={xKey}
                        cx="50%"
                        cy="50%"
                        outerRadius={105}
                        innerRadius={52}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                    >
                        {data.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
            </ResponsiveContainer>
        );
    }

    // ── Scatter ───────────────────────────────────────────────────────────────
    if (effectiveChartType === 'scatter') {
        const xScat = columns[0] ?? 'x';
        const yScat = columns[1] ?? 'y';
        return (
            <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={commonMargin}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey={xScat} name={xScat} tick={axisStyle} tickLine={false} axisLine={false} />
                    <YAxis dataKey={yScat} name={yScat} tick={axisStyle} tickLine={false} axisLine={false} />
                    <ZAxis range={[48, 48]} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={data} fill={PALETTE[0]} fillOpacity={0.75} />
                </ScatterChart>
            </ResponsiveContainer>
        );
    }

    // ── Table (default) ───────────────────────────────────────────────────────

    // Helper: format numbers to at most 2 decimal places
    const formatValue = (val: any): string => {
        if (val === null || val === undefined) return '—';
        if (typeof val === 'number' || (!isNaN(Number(val)) && String(val).trim() !== '')) {
            const n = Number(val);
            return Number.isInteger(n) ? String(n) : n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
        }
        return String(val);
    };

    // Helper: clean SQL aggregate headers like AVG(RELEASE_YEAR) → Avg Release Year
    const cleanHeader = (col: string): string => {
        const match = col.match(/^([A-Z_]+)\((.+)\)$/);
        if (match) {
            const fn = match[1].charAt(0) + match[1].slice(1).toLowerCase();
            const field = match[2].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return `${fn} ${field}`;
        }
        return col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b bg-muted/50">
                        {columns.map((col) => (
                            <th key={col} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                {cleanHeader(col)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            {columns.map((col) => (
                                <td key={col} className="px-3 py-2 font-mono">
                                    {formatValue(row[col])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
