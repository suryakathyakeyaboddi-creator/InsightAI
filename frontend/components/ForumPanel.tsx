'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Heart, MessageCircle, Plus, X, ArrowLeft,
    Tag, Clock, Search, Send, Users
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Reply {
    id: string;
    author: string;
    content: string;
    created_at: string;
}

interface Post {
    id: string;
    author: string;
    title: string;
    content: string;
    tag: string;
    likes: number;
    replies: Reply[];
    reply_count: number;
    created_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function getUserToken(): string {
    let t = localStorage.getItem('forum_user_token');
    if (!t) {
        t = crypto.randomUUID();
        localStorage.setItem('forum_user_token', t);
    }
    return t;
}

function getUsername(): string {
    return localStorage.getItem('forum_username') ?? '';
}

function setUsername(name: string) {
    localStorage.setItem('forum_username', name);
}

// ─── Tag Badge ─────────────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
    General: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    Insights: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    Strategy: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'Data Quality': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    Analytics: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    Question: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    Announcement: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

function TagBadge({ tag }: { tag: string }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TAG_COLORS[tag] ?? TAG_COLORS['General']}`}>
            <Tag className="h-2.5 w-2.5" />
            {tag}
        </span>
    );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
    const initials = name.trim() ? name.trim()[0].toUpperCase() : '?';
    const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500'];
    const color = colors[(name.charCodeAt(0) || 0) % colors.length];
    const sz = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
    return (
        <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
            {initials}
        </div>
    );
}

// ─── New Post Modal ────────────────────────────────────────────────────────────

function NewPostModal({ tags, onClose, onCreated }: {
    tags: string[];
    onClose: () => void;
    onCreated: (post: Post) => void;
}) {
    const [author, setAuthor] = useState(getUsername());
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tag, setTag] = useState('General');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) { setError('Title and content are required.'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${BASE}/api/forum/posts`, { author: author || 'Anonymous', title, content, tag });
            if (author.trim()) setUsername(author.trim());
            onCreated(res.data);
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.detail ?? 'Failed to post. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-3xl border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="font-bold text-base">New Discussion</h2>
                    <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-muted transition-colors">
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Your Name</label>
                            <input
                                value={author}
                                onChange={e => setAuthor(e.target.value)}
                                placeholder="Anonymous"
                                className="w-full rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Tag</label>
                            <select
                                value={tag}
                                onChange={e => setTag(e.target.value)}
                                className="rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all h-[38px]"
                            >
                                {tags.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Title</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="What's on your mind?"
                            className="w-full rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Content</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Share your insight, question, or business knowledge..."
                            rows={5}
                            className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none"
                        />
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Posting...' : 'Post Discussion'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── Thread View ───────────────────────────────────────────────────────────────

function ThreadView({ post, userToken, onBack, onLike }: {
    post: Post;
    userToken: string;
    onBack: () => void;
    onLike: (postId: string) => void;
}) {
    const [replies, setReplies] = useState<Reply[]>(post.replies ?? []);
    const [author, setAuthor] = useState(getUsername());

    // Main reply form
    const [mainContent, setMainContent] = useState('');
    const [sendingMain, setSendingMain] = useState(false);

    // Inline reply-to-reply: which reply id is open
    const [inlineReplyId, setInlineReplyId] = useState<string | null>(null);
    const [inlineContent, setInlineContent] = useState('');
    const [sendingInline, setSendingInline] = useState(false);

    const postReply = async (content: string, onDone: () => void) => {
        const res = await axios.post(`${BASE}/api/forum/posts/${post.id}/reply`, {
            author: author || 'Anonymous',
            content,
        });
        if (author.trim()) setUsername(author.trim());
        setReplies(prev => [...prev, res.data]);
        onDone();
    };

    const sendMain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mainContent.trim()) return;
        setSendingMain(true);
        try { await postReply(mainContent, () => setMainContent('')); }
        finally { setSendingMain(false); }
    };

    const openInline = (r: Reply) => {
        setInlineReplyId(r.id);
        setInlineContent(`@${r.author} `);
    };

    const sendInline = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inlineContent.trim()) return;
        setSendingInline(true);
        try {
            await postReply(inlineContent, () => {
                setInlineReplyId(null);
                setInlineContent('');
            });
        } finally { setSendingInline(false); }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Back */}
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to discussions
            </button>

            {/* Original post */}
            <div className="rounded-2xl border bg-card p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <Avatar name={post.author} />
                        <div>
                            <p className="text-sm font-semibold">{post.author}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />{timeAgo(post.created_at)}
                            </p>
                        </div>
                    </div>
                    <TagBadge tag={post.tag} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-foreground mb-2">{post.title}</h2>
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>
                <div className="flex items-center gap-4 pt-2 border-t">
                    <button
                        onClick={() => onLike(post.id)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-rose-500 transition-colors"
                    >
                        <Heart className="h-4 w-4" /> {post.likes}
                    </button>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MessageCircle className="h-4 w-4" /> {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                    </span>
                </div>
            </div>

            {/* Replies with per-reply Reply button */}
            {replies.length > 0 && (
                <div className="space-y-1">
                    <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground/60 mb-3">
                        Replies
                    </p>
                    {replies.map(r => (
                        <div key={r.id} className="space-y-1">
                            <div className="flex gap-3">
                                <Avatar name={r.author} size="sm" />
                                <div className="flex-1">
                                    <div className="rounded-2xl rounded-tl-sm bg-muted/40 border border-border/40 px-4 py-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-semibold">{r.author}</span>
                                            <span className="text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</span>
                                        </div>
                                        {/* Highlight @mentions */}
                                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                            {r.content.split(/(@\S+)/g).map((part, i) =>
                                                part.startsWith('@')
                                                    ? <span key={i} className="font-semibold text-violet-500">{part}</span>
                                                    : part
                                            )}
                                        </p>
                                    </div>
                                    {/* Reply button under each reply */}
                                    <button
                                        onClick={() => inlineReplyId === r.id ? setInlineReplyId(null) : openInline(r)}
                                        className="ml-2 mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-violet-500 transition-colors"
                                    >
                                        <MessageCircle className="h-3 w-3" />
                                        {inlineReplyId === r.id ? 'Cancel' : 'Reply'}
                                    </button>

                                    {/* Inline reply form for this specific reply */}
                                    {inlineReplyId === r.id && (
                                        <form
                                            onSubmit={sendInline}
                                            className="mt-2 ml-2 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-150"
                                        >
                                            <textarea
                                                autoFocus
                                                value={inlineContent}
                                                onChange={e => setInlineContent(e.target.value)}
                                                rows={2}
                                                placeholder={`Replying to @${r.author}...`}
                                                className="flex-1 rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none"
                                            />
                                            <button
                                                type="submit"
                                                disabled={sendingInline || !inlineContent.trim()}
                                                className="self-end rounded-xl bg-violet-600 p-2 text-white hover:bg-violet-500 disabled:opacity-40 transition-all"
                                            >
                                                <Send className="h-3.5 w-3.5" />
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Main reply form at the bottom */}
            <div className="rounded-2xl border bg-card p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Add a reply</p>
                <form onSubmit={sendMain} className="space-y-3">
                    <input
                        value={author}
                        onChange={e => setAuthor(e.target.value)}
                        placeholder="Your name (optional)"
                        className="w-full rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                    />
                    <div className="flex gap-2">
                        <textarea
                            value={mainContent}
                            onChange={e => setMainContent(e.target.value)}
                            placeholder="Share your thoughts..."
                            rows={3}
                            className="flex-1 rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none"
                        />
                        <button
                            type="submit"
                            disabled={sendingMain || !mainContent.trim()}
                            className="self-end rounded-xl bg-violet-600 p-2.5 text-white hover:bg-violet-500 disabled:opacity-40 transition-all"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Post Card ─────────────────────────────────────────────────────────────────

function PostCard({ post, userToken, onClick, onLike, isOpening }: {
    post: Post;
    userToken: string;
    onClick: () => void;
    onLike: (postId: string) => void;
    isOpening?: boolean;
}) {
    return (
        <div
            onClick={onClick}
            className={`group rounded-2xl border bg-card p-5 shadow-sm cursor-pointer hover:border-violet-500/30 hover:shadow-md transition-all space-y-3 ${isOpening ? 'opacity-70 pointer-events-none' : ''}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <Avatar name={post.author} />
                    <div>
                        <p className="text-sm font-semibold leading-tight">{post.author}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />{timeAgo(post.created_at)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isOpening && (
                        <div className="flex gap-0.5">
                            {[0,1,2].map(i => (
                                <div key={i} className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce"
                                    style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    )}
                    <TagBadge tag={post.tag} />
                </div>
            </div>
            <div>
                <h3 className="text-sm font-bold text-foreground group-hover:text-violet-600 transition-colors leading-snug mb-1">{post.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{post.content}</p>
            </div>
            <div className="flex items-center gap-4 pt-1">
                <button
                    onClick={e => { e.stopPropagation(); onLike(post.id); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 transition-colors"
                >
                    <Heart className="h-3.5 w-3.5" /> {post.likes}
                </button>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageCircle className="h-3.5 w-3.5" /> {post.reply_count ?? (post.replies?.length ?? 0)}
                </span>
            </div>
        </div>
    );
}

// ─── Main Forum Panel ──────────────────────────────────────────────────────────

export default function ForumPanel() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [openPost, setOpenPost] = useState<Post | null>(null);
    const [openingId, setOpeningId] = useState<string | null>(null); // loading state per card
    const userToken = typeof window !== 'undefined' ? getUserToken() : '';

    const loadPosts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BASE}/api/forum/posts`);
            setPosts(res.data.posts ?? []);
            setTags(res.data.tags ?? []);
        } catch { } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadPosts(); }, [loadPosts]);

    const handleLike = async (postId: string) => {
        try {
            const res = await axios.post(`${BASE}/api/forum/posts/${postId}/like`, { user_token: userToken });
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: res.data.likes } : p));
            if (openPost?.id === postId) setOpenPost(prev => prev ? { ...prev, likes: res.data.likes } : prev);
        } catch { }
    };

    const handleCreated = (post: Post) => {
        setPosts(prev => [post, ...prev]);
    };

    const handleOpenPost = async (postId: string) => {
        setOpeningId(postId);
        try {
            const res = await axios.get(`${BASE}/api/forum/posts/${postId}`);
            setOpenPost(res.data);
        } catch {
            // fallback: use the card data (may have empty replies)
            const fallback = posts.find(p => p.id === postId) ?? null;
            setOpenPost(fallback);
        } finally {
            setOpeningId(null);
        }
    };

    const filtered = posts.filter(p => {
        const matchTag = !activeTag || p.tag === activeTag;
        const q = search.toLowerCase();
        const matchSearch = !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.author.toLowerCase().includes(q);
        return matchTag && matchSearch;
    });

    // Thread view
    if (openPost) {
        return (
            <ThreadView
                post={openPost}
                userToken={userToken}
                onBack={() => setOpenPost(null)}
                onLike={handleLike}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Users className="h-5 w-5 text-violet-500" /> Community Forum
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Discuss insights, share strategies, and collaborate with your team.</p>
                </div>
                <button
                    onClick={() => setShowNew(true)}
                    className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 active:scale-95 transition-all shadow-lg shadow-violet-500/20"
                >
                    <Plus className="h-4 w-4" /> New Post
                </button>
            </div>

            {/* Search + Tag filters */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search discussions..."
                        className="w-full rounded-xl border bg-card pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveTag(null)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${!activeTag ? 'bg-violet-600 text-white border-violet-600' : 'bg-card text-muted-foreground border-border hover:border-violet-400'}`}
                    >
                        All
                    </button>
                    {tags.map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTag(activeTag === t ? null : t)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${activeTag === t ? 'bg-violet-600 text-white border-violet-600' : 'bg-card text-muted-foreground border-border hover:border-violet-400'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Post list */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 h-52 rounded-2xl border border-dashed text-sm text-muted-foreground">
                    <span className="text-4xl">💬</span>
                    <div className="text-center">
                        <p className="font-semibold">{search || activeTag ? 'No matching discussions' : 'No discussions yet'}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Be the first to start a conversation!</p>
                    </div>
                    <button onClick={() => setShowNew(true)} className="mt-1 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-all">
                        Start a Discussion
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(p => (
                        <PostCard
                            key={p.id}
                            post={p}
                            userToken={userToken}
                            onClick={() => handleOpenPost(p.id)}
                            onLike={handleLike}
                            isOpening={openingId === p.id}
                        />
                    ))}
                </div>
            )}

            {/* New post modal */}
            {showNew && (
                <NewPostModal
                    tags={tags}
                    onClose={() => setShowNew(false)}
                    onCreated={handleCreated}
                />
            )}
        </div>
    );
}
