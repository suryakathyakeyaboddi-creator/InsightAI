'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { CloudUpload, FileSpreadsheet, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadFile } from '@/lib/api';

interface FileUploadProps {
    onUploadSuccess: (sessionId: string, schema: any) => void;
}

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const onDrop = useCallback((accepted: File[], rejected: any[]) => {
        if (rejected.length) {
            toast.error('Only .csv, .xlsx, and .pdf files are accepted.');
            return;
        }
        setSelectedFile(accepted[0]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/pdf': ['.pdf'],
        },
        maxFiles: 1,
        disabled: uploading,
    });

    const handleUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        try {
            const data = await uploadFile(selectedFile);
            onUploadSuccess(data.session_id, data);
            toast.success('File uploaded successfully!');
        } catch (err: any) {
            const msg =
                err?.response?.data?.detail || err?.message || 'Upload failed. Please try again.';
            toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            setUploading(false);
        }
    };

    return (
        <div className="w-full space-y-4">
            {/* Drop Zone */}
            <div
                {...getRootProps()}
                className={[
                    'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-all cursor-pointer select-none',
                    isDragActive
                        ? 'border-violet-500 bg-violet-500/10 scale-[1.01]'
                        : 'border-border bg-muted/30 hover:border-violet-400 hover:bg-violet-500/5',
                    uploading ? 'pointer-events-none opacity-50' : '',
                ].join(' ')}
            >
                <input {...getInputProps()} />
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/15">
                    <CloudUpload className="h-7 w-7 text-violet-500" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                        {isDragActive ? 'Drop the file here…' : 'Drag & drop your dataset here'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Supports .csv, .xlsx, and .pdf · Max 50 MB</p>
                </div>
                <span className="rounded-full border border-violet-400 px-4 py-1 text-xs font-medium text-violet-500 hover:bg-violet-500 hover:text-white transition-colors">
                    Browse files
                </span>
            </div>

            {/* Selected file chip */}
            {selectedFile && !uploading && (
                <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
                    <FileSpreadsheet className="h-5 w-5 shrink-0 text-violet-500" />
                    <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                        className="rounded-full p-1 hover:bg-muted transition-colors"
                    >
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>
            )}

            {/* Upload loading skeleton */}
            {uploading && (
                <div className="space-y-2">
                    <Skeleton className="h-3 w-full rounded-full" />
                    <Skeleton className="h-3 w-4/5 rounded-full" />
                    <p className="text-center text-xs text-muted-foreground animate-pulse">
                        Uploading and analysing dataset…
                    </p>
                </div>
            )}

            {/* Upload button */}
            {selectedFile && !uploading && (
                <button
                    onClick={handleUpload}
                    className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition-all hover:bg-violet-500 hover:scale-[1.01] active:scale-[0.99]"
                >
                    Analyse Dataset →
                </button>
            )}
        </div>
    );
}
