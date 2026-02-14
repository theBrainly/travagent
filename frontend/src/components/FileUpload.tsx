import React, { useState, useRef } from 'react';
import { uploadAPI } from '../services/api';
import { Document } from '../types';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploadProps {
    category: string;
    linkedTo?: { model: string; documentId: string };
    onUploadComplete?: (docs: Document[]) => void;
    allowMultiple?: boolean;
    className?: string;
    existingFiles?: Document[];
    onDelete?: (id: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
    category,
    linkedTo,
    onUploadComplete,
    allowMultiple = false,
    className = '',
    existingFiles = [],
    onDelete
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const handleFiles = async (files: File[]) => {
        if (!allowMultiple && files.length > 1) {
            toast.error('Only single file upload is allowed');
            return;
        }

        setUploading(true);
        try {
            let res;
            if (allowMultiple) {
                res = await uploadAPI.uploadMultiple(files, category, linkedTo);
            } else {
                res = await uploadAPI.uploadSingle(files[0], category, linkedTo);
            }

            const newDocs = res.data.data || res.data.documents || (Array.isArray(res.data) ? res.data : [res.data]);
            toast.success('Upload successful');
            if (onUploadComplete) {
                onUploadComplete(Array.isArray(newDocs) ? newDocs : [newDocs]);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this file?')) return;
        try {
            await uploadAPI.delete(id);
            toast.success('File deleted');
            if (onDelete) onDelete(id);
        } catch {
            toast.error('Delete failed');
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${isDragOver ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-gray-300'
                    } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple={allowMultiple}
                    onChange={handleFileSelect}
                />
                <div className="flex flex-col items-center gap-2">
                    {uploading ? (
                        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                            <Upload className="w-5 h-5" />
                        </div>
                    )}
                    <div className="text-sm font-medium text-gray-700">
                        {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </div>
                    <div className="text-xs text-gray-500">
                        {allowMultiple ? 'Upload multiple files' : 'Upload a single file'} (PDF, JPG, PNG)
                    </div>
                </div>
            </div>

            {existingFiles.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded Files</h4>
                    <div className="space-y-2">
                        {existingFiles.map((doc) => (
                            <div key={doc._id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{doc.originalName || doc.fileName}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                                            <span>•</span>
                                            <span>{new Date(doc.createdAt || Date.now()).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-sky-600 transition-colors" title="View">
                                        <EyeIcon />
                                    </a>
                                    {onDelete && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(doc._id); }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Delete"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
