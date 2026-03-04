'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, BarChart3, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import FileUpload from '@/components/FileUpload';
import PageSummarizer from '@/components/PageSummarizer';

const EXAMPLE_QUESTIONS = [
  'Total revenue by region',
  'Top 5 products by units sold',
  'Monthly cost trend over time',
];

export default function HomePage() {
  const router = useRouter();

  const handleUploadSuccess = (sessionId: string, schema: any) => {
    // Store schema in session storage so the dashboard can read it
    sessionStorage.setItem(`schema_${sessionId}`, JSON.stringify(schema));
    router.push(`/dashboard?session=${sessionId}`);
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
        {/* Subtle radial gradient blob */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Business Intelligence
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Insight<span className="text-violet-500">AI</span>
            </h1>
            <p className="text-base text-muted-foreground">
              Upload your dataset and ask questions in plain English.
              <br />
              Get SQL, charts, and insights — instantly.
            </p>
          </div>

          {/* Upload card */}
          <div className="rounded-2xl border bg-card p-6 shadow-xl shadow-black/5">
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>

          {/* Example questions */}
          <div className="space-y-2 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Example questions
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <Badge key={q} variant="secondary" className="cursor-default text-xs py-1 px-3">
                  {q}
                </Badge>
              ))}
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5 text-violet-400" /> Auto Charts</span>
            <span className="flex items-center gap-1"><Brain className="h-3.5 w-3.5 text-violet-400" /> AI Insights</span>
            <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-violet-400" /> Anomaly Detection</span>
          </div>
        </div>
      </main>
      <PageSummarizer />
    </>
  );
}
