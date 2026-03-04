'use client';

import { Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InsightCardProps {
    insight: string;
    rowCount: number;
}

export default function InsightCard({ insight, rowCount }: InsightCardProps) {
    return (
        <Card className="border-l-4 border-l-indigo-500 rounded-xl shadow-sm">
            <CardContent className="p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-start gap-2.5">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                    <p className="text-sm leading-relaxed text-foreground flex-1">{insight}</p>
                </div>

                {/* Row count badge */}
                <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs font-medium">
                        {rowCount.toLocaleString()} row{rowCount !== 1 ? 's' : ''} analysed
                    </Badge>
                </div>

                {/* Footer disclaimer */}
                <p className="text-[10px] text-muted-foreground border-t pt-2">
                    AI-generated insight. Verify before decisions.
                </p>
            </CardContent>
        </Card>
    );
}
