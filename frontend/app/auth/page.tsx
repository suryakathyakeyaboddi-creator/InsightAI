'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart2, Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function AuthPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) { setError('Please enter your email.'); return; }
        if (!password.trim()) { setError('Please enter a password.'); return; }

        setLoading(true);
        setError('');

        // Simulate a brief "auth" delay for UX feel
        await new Promise(r => setTimeout(r, 700));

        // Store user info in localStorage (demo auth)
        const user = {
            email: email.trim(),
            name: fullName.trim() || email.split('@')[0],
        };
        localStorage.setItem('insightai_user', JSON.stringify(user));

        router.push('/');
    };

    return (
        <div className="min-h-screen flex">
            {/* ── Left branding panel ──────────────────────────────── */}
            <div
                className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1e0a3c 0%, #2d0f5e 40%, #1a0933 100%)' }}
            >
                {/* Background orbs */}
                <div className="absolute top-20 left-10 h-64 w-64 rounded-full opacity-20 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #7C3AED, transparent)' }} />
                <div className="absolute bottom-20 right-10 h-48 w-48 rounded-full opacity-15 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full opacity-10 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #A855F7, transparent)' }} />

                <div className="relative z-10 text-center space-y-8 max-w-sm">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
                            style={{ background: 'linear-gradient(135deg, #7C3AED, #6366F1)' }}>
                            <BarChart2 className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-3xl font-black text-white">
                            Insight<span className="text-violet-400">AI</span>
                        </span>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-4xl font-bold text-white leading-tight">
                            Turn data into<br />
                            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                                decisions
                            </span>
                        </h1>
                        <p className="text-purple-200/80 text-lg leading-relaxed">
                            Upload your dataset and get AI-powered insights, charts, and business recommendations — instantly.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {[
                            { icon: '📊', text: 'Auto-generated charts & visualizations' },
                            { icon: '🤖', text: 'Chat with your data using AI' },
                            { icon: '💡', text: 'Business tips powered by real numbers' },
                            { icon: '👥', text: 'Community forum for team insights' },
                        ].map((f, i) => (
                            <div key={i}
                                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-purple-100"
                                style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
                                <span className="text-lg">{f.icon}</span>
                                {f.text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Right auth form panel ────────────────────────────── */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
                <div className="w-full max-w-md space-y-7">
                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center justify-center gap-2">
                        <BarChart2 className="h-6 w-6 text-violet-600" />
                        <span className="text-2xl font-black">Insight<span className="text-violet-600">AI</span></span>
                    </div>

                    {/* Header */}
                    <div className="text-center space-y-1">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400 mb-3">
                            <Sparkles className="h-3 w-3" />
                            AI-Powered Business Intelligence
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">
                            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {mode === 'signin'
                                ? 'Sign in to access your InsightAI dashboard'
                                : 'Get started — enter any details to continue'}
                        </p>
                    </div>

                    {/* Mode toggle */}
                    <div className="flex rounded-xl border bg-muted/30 p-1">
                        {(['signin', 'signup'] as const).map(m => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setError(''); }}
                                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                                    mode === m
                                        ? 'bg-background text-foreground shadow'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {m === 'signin' ? 'Sign In' : 'Sign Up'}
                            </button>
                        ))}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'signup' && (
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                                    Full Name <span className="font-normal text-muted-foreground/60">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full rounded-xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                className="w-full rounded-xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Any password works"
                                    className="w-full rounded-xl border bg-card px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-60 active:scale-[0.98] shadow-lg shadow-violet-500/20"
                            style={{ background: 'linear-gradient(135deg, #7C3AED, #6366F1)' }}
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {mode === 'signin' ? 'Sign In to InsightAI' : 'Get Started →'}
                        </button>
                    </form>

                    <p className="text-center text-xs text-muted-foreground">
                        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                        <button
                            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
                            className="text-violet-600 font-semibold hover:underline"
                        >
                            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
